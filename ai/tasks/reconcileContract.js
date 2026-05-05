"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReconcileContractCli = exports.reconcileB2BContractOrKeepDraft = exports.reconcileB2BContract = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../client");
const llmJsonExtraction_1 = require("../utils/llmJsonExtraction");
const b2bValidator_1 = require("../validators/b2bValidator");
const requirementWorkshopPrompt_1 = require("../prompts/requirementWorkshopPrompt");
const contextExtractor_1 = require("../utils/contextExtractor");
const exitCodes_1 = require("../cli/exitCodes");
const MAX_DRAFT_CHARS = 120_000;
/**
 * Segunda pasada con LLM: alinea el contrato con requisito + Q&A.
 * Si la pasada falla o el JSON resultante no valida, se devuelve el borrador original.
 */
async function reconcileB2BContract(input) {
    const draftStr = JSON.stringify(input.draftContract, null, 2);
    if (draftStr.length > MAX_DRAFT_CHARS) {
        return { ok: false, reason: `Borrador demasiado largo (>${MAX_DRAFT_CHARS} caracteres).` };
    }
    const prompt = (0, requirementWorkshopPrompt_1.buildContractReconciliationPrompt)(input.feature, input.requirementBody, input.qaText, draftStr, input.dbSchema, input.domainContext);
    let raw;
    try {
        raw = await (0, client_1.generateCode)("Revisor de contrato B2B NitroGroups (reconciliación)", prompt);
    }
    catch (e) {
        return { ok: false, reason: e?.message || String(e) };
    }
    const jsonStr = (0, llmJsonExtraction_1.extractJsonObjectFromLlmText)(raw);
    if (!jsonStr) {
        return { ok: false, reason: "No se pudo extraer JSON del resultado de reconciliación." };
    }
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    }
    catch {
        return { ok: false, reason: "JSON de reconciliación inválido." };
    }
    parsed.feature = input.feature;
    if (!parsed.entityHash)
        parsed.entityHash = input.draftContract.entityHash ?? "INITIAL_SIGNATURE";
    if (!parsed.v)
        parsed.v = input.draftContract.v ?? "1.0.0";
    const integrity = (0, b2bValidator_1.validateContractIntegrity)(parsed);
    if (!integrity.isValid) {
        return {
            ok: false,
            reason: `Tras reconciliación, el validador falló: ${integrity.errors.join("; ")}.`
        };
    }
    return { ok: true, contract: parsed, usedReconciled: true };
}
exports.reconcileB2BContract = reconcileB2BContract;
/**
 * Igual que {@link reconcileB2BContract}, pero nunca “falla” hacia arriba: si la
 * reconciliación truca el JSON, devuelve el borrador con `usedReconciled: false`.
 */
async function reconcileB2BContractOrKeepDraft(input) {
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
exports.reconcileB2BContractOrKeepDraft = reconcileB2BContractOrKeepDraft;
/**
 * CLI `reconcile-contract`: re-lee requisito (+ Q&A opcional), contrato actual,
 * segunda pasada LLM, escribe el JSON validado (o solo imprime en --dry-run).
 */
async function runReconcileContractCli(options) {
    const contractPath = path_1.default.join(process.cwd(), "ai", "contracts", "b2b", `${options.feature}.contract.json`);
    if (!fs_1.default.existsSync(contractPath)) {
        console.error(`❌ No existe el contrato: ${path_1.default.relative(process.cwd(), contractPath)}`);
        return exitCodes_1.ExitCodes.CLI_USAGE;
    }
    let draft;
    try {
        draft = JSON.parse(fs_1.default.readFileSync(contractPath, "utf-8"));
    }
    catch {
        console.error(`❌ No se pudo leer/parsear JSON: ${contractPath}`);
        return exitCodes_1.ExitCodes.FAILED;
    }
    const dbSchema = (0, contextExtractor_1.extractDbSchema)() ?? null;
    const domainContext = (0, contextExtractor_1.extractDomainContext)(options.feature) ?? null;
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
        return exitCodes_1.ExitCodes.FAILED;
    }
    console.log(`   ✔ Contrato validado (post-reconciliación).`);
    if (options.dryRun) {
        console.log("\n--dry-run: no se escribió el archivo.\n");
        return exitCodes_1.ExitCodes.OK;
    }
    fs_1.default.writeFileSync(contractPath, JSON.stringify(rec.contract, null, 2), "utf-8");
    console.log(`\n✅ Guardado: ${path_1.default.relative(process.cwd(), contractPath)}\n`);
    return exitCodes_1.ExitCodes.OK;
}
exports.runReconcileContractCli = runReconcileContractCli;
