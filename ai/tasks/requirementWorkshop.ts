import fs from "fs";
import path from "path";
import { generateCode } from "../client";
import { confirmAction } from "../utils/diffViewer";
import { askLine } from "../utils/promptLine";
import { extractJsonObjectFromLlmText } from "../utils/llmJsonExtraction";
import { extractDbSchema, extractDomainContext } from "../utils/contextExtractor";
import { validateContractIntegrity } from "../validators/b2bValidator";
import { initMemory, rememberDecision } from "../memory/engramClient";
import { buildAnalysisPrompt, buildContractSynthesisPrompt } from "../prompts/requirementWorkshopPrompt";
import { ExitCodes } from "../cli/exitCodes";
import { PATHS } from "../config/paths";

export interface RequirementWorkshopOptions {
    feature: string;
    /** Cuerpo del requisito (desde --file o --req). */
    requirementBody: string;
    force: boolean;
}

interface AnalysisQuestion {
    id: string;
    text: string;
    context?: string;
}

interface AnalysisResult {
    summary: string;
    questions: AnalysisQuestion[];
}

const MAX_REQ_CHARS = 48_000;

/** Si el LLM omite "endpoint", reutiliza el del contrato B2B ya versionado (pasa validateContractIntegrity). */
function ensureContractRootEndpoint(contract: Record<string, unknown>, feature: string): void {
    const ep = contract.endpoint;
    if (typeof ep === "string" && ep.trim().startsWith("/api/")) {
        return;
    }
    const p = path.join(process.cwd(), "ai", "contracts", "b2b", `${feature}.contract.json`);
    if (!fs.existsSync(p)) {
        return;
    }
    try {
        const prev = JSON.parse(fs.readFileSync(p, "utf8")) as { endpoint?: string };
        if (typeof prev.endpoint === "string" && prev.endpoint.trim().startsWith("/api/")) {
            contract.endpoint = prev.endpoint.trim();
            console.warn(
                `⚠️  El borrador no traía "endpoint" válido en la raíz; se reutilizó el de ${path.relative(process.cwd(), p)}`
            );
        }
    } catch {
        /* ignore */
    }
}

function loadRequirementBody(options: RequirementWorkshopOptions): { body: string; error?: string } {
    if (!options.requirementBody?.trim()) {
        return { body: "", error: "El texto del requisito está vacío." };
    }
    if (options.requirementBody.length > MAX_REQ_CHARS) {
        return { body: "", error: `Requisito demasiado largo (>${MAX_REQ_CHARS} caracteres).` };
    }
    return { body: options.requirementBody.trim() };
}

function parseAnalysisJson(raw: string): AnalysisResult | null {
    const jsonStr = extractJsonObjectFromLlmText(raw);
    if (!jsonStr) return null;
    try {
        const o = JSON.parse(jsonStr) as { summary?: string; questions?: AnalysisQuestion[] };
        if (!o.summary || !Array.isArray(o.questions)) return null;
        return {
            summary: o.summary,
            questions: o.questions
                .filter(q => q && typeof q.text === "string" && String(q.text).trim())
                .map((q, i) => ({
                    id: (q.id && String(q.id).trim()) || `q${i + 1}`,
                    text: String(q.text).trim(),
                    context: q.context ? String(q.context) : undefined
                }))
        };
    } catch {
        return null;
    }
}

/**
 * 1) IA analiza el requisito y propone preguntas.
 * 2) El usuario responde en consola.
 * 3) IA sintetiza el contrato B2B; valida; opcional guarda.
 * 4) El siguiente paso es `generate-feature` (FASE B).
 */
export async function runRequirementWorkshop(options: RequirementWorkshopOptions): Promise<number> {
    const loaded = loadRequirementBody(options);
    if (loaded.error) {
        console.error(`❌ ${loaded.error}`);
        return ExitCodes.CLI_USAGE;
    }
    const requirement = loaded.body;

    await initMemory();

    const dbSchema = extractDbSchema() ?? null;
    const domainContext = extractDomainContext(options.feature) ?? null;

    console.log(`\n🧩 ═══ TALLER DE REQUISITOS: '${options.feature}' ═══`);
    console.log(
        `   Requisito: usa --file=${options.feature}.md (solo nombre → ${PATHS.requirements}/). ` +
            `Paso 1/3: análisis con IA…\n`
    );

    const analysisPrompt = buildAnalysisPrompt(options.feature, requirement, dbSchema, domainContext);
    let analysisRaw: string;
    try {
        analysisRaw = await generateCode("Arquitecto de requisitos NitroGroups", analysisPrompt);
    } catch (e: any) {
        console.error(`❌ Llamada LLM falló: ${e?.message || e}`);
        return ExitCodes.FAILED;
    }

    const analysis = parseAnalysisJson(analysisRaw);
    if (!analysis || analysis.questions.length < 1) {
        console.error("❌ No se pudo extraer un JSON de análisis con 'summary' y 'questions[]'. Vuelve a intentar o acorta el requisito.");
        console.log("\n--- salida recortada ---\n", analysisRaw?.slice(0, 1_200), "\n------------------------\n");
        return ExitCodes.FAILED;
    }

    if (analysis.questions.length < 3) {
        console.warn("⚠️  Pocas preguntas generadas; puedes añadir criterio manual al contrato luego.\n");
    }

    console.log("═══════════════════════════════════════");
    console.log(`Resumen: ${analysis.summary}\n`);
    console.log("Preguntas a resolver (responde en consola, una a una):");
    console.log("═══════════════════════════════════════\n");

    const answers: { id: string; question: string; answer: string }[] = [];
    for (const q of analysis.questions) {
        if (q.context) {
            console.log(`\n[${q.id}] ${q.text}`);
            console.log(`    Contexto: ${q.context}`);
        } else {
            console.log(`\n[${q.id}] ${q.text}`);
        }
        const a = await askLine("    Tu respuesta: ");
        answers.push({ id: q.id, question: q.text, answer: a || "(sin respuesta)" });
    }

    const qaText = answers
        .map(x => `**${x.id}** P: ${x.question}\n   R: ${x.answer}`)
        .join("\n\n");

    console.log(`\n   Paso 2/3: Sintetizando contrato B2B con IA…\n`);

    const contractPrompt = buildContractSynthesisPrompt(
        options.feature,
        requirement,
        qaText,
        dbSchema,
        domainContext
    );

    let contractRaw: string;
    try {
        contractRaw = await generateCode("Arquitecto de contrato B2B NitroGroups", contractPrompt);
    } catch (e: any) {
        console.error(`❌ Síntesis de contrato falló: ${e?.message || e}`);
        return ExitCodes.FAILED;
    }

    const contractJson = extractJsonObjectFromLlmText(contractRaw);
    if (!contractJson) {
        console.error("❌ No se pudo extraer JSON del contrato. Revisa la salida o reintenta.");
        console.log(contractRaw?.slice(0, 2_000));
        return ExitCodes.FAILED;
    }

    let contract: Record<string, unknown>;
    try {
        contract = JSON.parse(contractJson) as Record<string, unknown>;
    } catch {
        console.error("❌ El contrato no es JSON válido.");
        return ExitCodes.FAILED;
    }

    contract.feature = options.feature;
    if (!contract.entityHash) contract.entityHash = "INITIAL_SIGNATURE";
    if (!contract.v) contract.v = "1.0.0";

    ensureContractRootEndpoint(contract, options.feature);

    const integrity = validateContractIntegrity(contract);
    if (!integrity.isValid) {
        console.error("❌ Contrato B2B inválido según el validador:");
        integrity.errors.forEach(err => console.error(`   · ${err}`));
        if (integrity.warnings.length) {
            integrity.warnings.forEach(w => console.warn(`   ⚠️  ${w}`));
        }
        console.log("\n--- contrato (para copiar/ajustar) ---\n", JSON.stringify(contract, null, 2).slice(0, 3_000));
        return ExitCodes.FAILED;
    }
    integrity.warnings.forEach(w => console.warn(`⚠️  ${w}`));

    const { reconcileB2BContractOrKeepDraft } = await import("./reconcileContract");
    console.log(`\n   Paso 2.5/3: Reconciliación requisito + Q&A ↔ contrato (segunda pasada)…\n`);
    const reconciled = await reconcileB2BContractOrKeepDraft({
        feature: options.feature,
        requirementBody: requirement,
        qaText: qaText,
        draftContract: contract,
        dbSchema: extractDbSchema() ?? null,
        domainContext: extractDomainContext(options.feature) ?? null
    });
    contract = reconciled.contract;
    if (reconciled.warning) {
        console.warn(
            `⚠️  Reconciliación no pudo alinear (LLM/JSON/validación): ${reconciled.warning}\n` +
                `   Se mantiene el contrato de la primera pasada.\n`
        );
    } else if (reconciled.usedReconciled) {
        console.log(`   ✔ Contrato ajustado tras reconciliación con requisito y Q&A.`);
    }

    const integrity2 = validateContractIntegrity(contract);
    if (!integrity2.isValid) {
        console.error("❌ Tras reconciliación el contrato dejó de ser válido (no debería ocurrir).");
        integrity2.errors.forEach(err => console.error(`   · ${err}`));
        return ExitCodes.FAILED;
    }
    integrity2.warnings.forEach(w => console.warn(`⚠️  ${w}`));

    const contractPath = path.join(process.cwd(), "ai", "contracts", "b2b", `${options.feature}.contract.json`);
    if (fs.existsSync(contractPath) && !options.force) {
        const go = await confirmAction(`Ya existe ${path.relative(process.cwd(), contractPath)}. ¿Sobrescribir?`);
        if (!go) {
            console.log("❌ No se guardó. Usa --force o borra el contrato y re-ejecuta.\n");
            return ExitCodes.ABORTED;
        }
    }

    const finalAccept = await confirmAction("¿Guardar este contrato y luego generarás código con 'generate-feature'?");
    if (!finalAccept) {
        console.log("Operación cancelada. Puedes copiar y pegar el JSON de arriba si se imprimió.\n");
        return ExitCodes.ABORTED;
    }

    fs.mkdirSync(path.dirname(contractPath), { recursive: true });
    fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2), "utf-8");

    await rememberDecision(
        options.feature,
        "Contrato creado vía requirement-workshop (requisito + Q&A) antes de generate-feature."
    );

    console.log(`\n✅ Contrato guardado: ${path.relative(process.cwd(), contractPath)}`);
    console.log(
        `\nSiguiente paso (generar código, misma consola, raíz del repo):\n` +
            `  npm run ai -- generate-feature ${options.feature} --mode=full-stack\n`
    );
    return ExitCodes.OK;
}
