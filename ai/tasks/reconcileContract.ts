import fs from "fs";
import path from "path";
import { generateCode } from "../client";
import { extractJsonObjectFromLlmText } from "../utils/llmJsonExtraction";
import { validateContractIntegrity } from "../validators/b2bValidator";
import { buildContractReconciliationPrompt } from "../prompts/requirementWorkshopPrompt";
import { extractDbSchema, extractDomainContext } from "../utils/contextExtractor";
import { ExitCodes } from "../cli/exitCodes";

const MAX_DRAFT_CHARS = 120_000;

export interface ReconcileB2BInput {
    feature: string;
    requirementBody: string;
    qaText: string | null;
    draftContract: Record<string, unknown>;
    dbSchema: string | null;
    domainContext: string | null;
}

export interface ReconcileB2BSuccess {
    ok: true;
    contract: Record<string, unknown>;
    usedReconciled: boolean;
    warning?: string;
}

export interface ReconcileB2BFailure {
    ok: false;
    reason: string;
}

/**
 * Segunda pasada con LLM: alinea el contrato con requisito + Q&A.
 * Si la pasada falla o el JSON resultante no valida, se devuelve el borrador original.
 */
export async function reconcileB2BContract(input: ReconcileB2BInput): Promise<ReconcileB2BSuccess | ReconcileB2BFailure> {
    const draftStr = JSON.stringify(input.draftContract, null, 2);
    if (draftStr.length > MAX_DRAFT_CHARS) {
        return { ok: false, reason: `Borrador demasiado largo (>${MAX_DRAFT_CHARS} caracteres).` };
    }

    const prompt = buildContractReconciliationPrompt(
        input.feature,
        input.requirementBody,
        input.qaText,
        draftStr,
        input.dbSchema,
        input.domainContext
    );

    let raw: string;
    try {
        raw = await generateCode("Revisor de contrato B2B NitroGroups (reconciliación)", prompt);
    } catch (e: any) {
        return { ok: false, reason: e?.message || String(e) };
    }

    const jsonStr = extractJsonObjectFromLlmText(raw);
    if (!jsonStr) {
        return { ok: false, reason: "No se pudo extraer JSON del resultado de reconciliación." };
    }

    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
        return { ok: false, reason: "JSON de reconciliación inválido." };
    }

    parsed.feature = input.feature;
    if (!parsed.entityHash) parsed.entityHash = input.draftContract.entityHash ?? "INITIAL_SIGNATURE";
    if (!parsed.v) parsed.v = input.draftContract.v ?? "1.0.0";

    const integrity = validateContractIntegrity(parsed);
    if (!integrity.isValid) {
        return {
            ok: false,
            reason: `Tras reconciliación, el validador falló: ${integrity.errors.join("; ")}.`
        };
    }

    return { ok: true, contract: parsed, usedReconciled: true };
}

/**
 * Igual que {@link reconcileB2BContract}, pero nunca “falla” hacia arriba: si la
 * reconciliación truca el JSON, devuelve el borrador con `usedReconciled: false`.
 */
export async function reconcileB2BContractOrKeepDraft(
    input: ReconcileB2BInput
): Promise<ReconcileB2BSuccess> {
    const out = await reconcileB2BContract(input);
    if (out.ok) {
        return out;
    }
    return {
        ok: true,
        contract: input.draftContract,
        usedReconciled: false,
        warning: out.reason
    };
}

export interface ReconcileContractCliOptions {
    feature: string;
    requirementBody: string;
    qaBody: string | null;
    dryRun: boolean;
}

/**
 * CLI `reconcile-contract`: re-lee requisito (+ Q&A opcional), contrato actual,
 * segunda pasada LLM, escribe el JSON validado (o solo imprime en --dry-run).
 */
export async function runReconcileContractCli(options: ReconcileContractCliOptions): Promise<number> {
    const contractPath = path.join(process.cwd(), "ai", "contracts", "b2b", `${options.feature}.contract.json`);
    if (!fs.existsSync(contractPath)) {
        console.error(`❌ No existe el contrato: ${path.relative(process.cwd(), contractPath)}`);
        return ExitCodes.CLI_USAGE;
    }

    let draft: Record<string, unknown>;
    try {
        draft = JSON.parse(fs.readFileSync(contractPath, "utf-8")) as Record<string, unknown>;
    } catch {
        console.error(`❌ No se pudo leer/parsear JSON: ${contractPath}`);
        return ExitCodes.FAILED;
    }

    const dbSchema = extractDbSchema() ?? null;
    const domainContext = extractDomainContext(options.feature) ?? null;

    console.log(`\n🔄 Reconciliando contrato '${options.feature}' con requisito + Q&A…\n`);

    const rec = await reconcileB2BContract({
        feature: options.feature,
        requirementBody: options.requirementBody,
        qaText: options.qaBody,
        draftContract: draft,
        dbSchema,
        domainContext
    });

    if (!rec.ok) {
        console.error(`❌ Reconciliación falló: ${rec.reason}\n`);
        return ExitCodes.FAILED;
    }

    console.log(`   ✔ Contrato validado (post-reconciliación).`);

    if (options.dryRun) {
        console.log("\n--dry-run: no se escribió el archivo.\n");
        return ExitCodes.OK;
    }

    fs.writeFileSync(contractPath, JSON.stringify(rec.contract, null, 2), "utf-8");
    console.log(`\n✅ Guardado: ${path.relative(process.cwd(), contractPath)}\n`);
    return ExitCodes.OK;
}
