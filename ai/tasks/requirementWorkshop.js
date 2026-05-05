"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRequirementWorkshop = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../client");
const diffViewer_1 = require("../utils/diffViewer");
const promptLine_1 = require("../utils/promptLine");
const llmJsonExtraction_1 = require("../utils/llmJsonExtraction");
const contextExtractor_1 = require("../utils/contextExtractor");
const b2bValidator_1 = require("../validators/b2bValidator");
const engramClient_1 = require("../memory/engramClient");
const requirementWorkshopPrompt_1 = require("../prompts/requirementWorkshopPrompt");
const exitCodes_1 = require("../cli/exitCodes");
const paths_1 = require("../config/paths");
const MAX_REQ_CHARS = 48_000;
function loadRequirementBody(options) {
    if (!options.requirementBody?.trim()) {
        return { body: "", error: "El texto del requisito está vacío." };
    }
    if (options.requirementBody.length > MAX_REQ_CHARS) {
        return { body: "", error: `Requisito demasiado largo (>${MAX_REQ_CHARS} caracteres).` };
    }
    return { body: options.requirementBody.trim() };
}
function parseAnalysisJson(raw) {
    const jsonStr = (0, llmJsonExtraction_1.extractJsonObjectFromLlmText)(raw);
    if (!jsonStr)
        return null;
    try {
        const o = JSON.parse(jsonStr);
        if (!o.summary || !Array.isArray(o.questions))
            return null;
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
    }
    catch {
        return null;
    }
}
/**
 * 1) IA analiza el requisito y propone preguntas.
 * 2) El usuario responde en consola.
 * 3) IA sintetiza el contrato B2B; valida; opcional guarda.
 * 4) El siguiente paso es `generate-feature` (FASE B).
 */
async function runRequirementWorkshop(options) {
    const loaded = loadRequirementBody(options);
    if (loaded.error) {
        console.error(`❌ ${loaded.error}`);
        return exitCodes_1.ExitCodes.CLI_USAGE;
    }
    const requirement = loaded.body;
    await (0, engramClient_1.initMemory)();
    const dbSchema = (0, contextExtractor_1.extractDbSchema)() ?? null;
    const domainContext = (0, contextExtractor_1.extractDomainContext)(options.feature) ?? null;
    console.log(`\n🧩 ═══ TALLER DE REQUISITOS: '${options.feature}' ═══`);
    console.log(`   Requisito: usa --file=${options.feature}.md (solo nombre → ${paths_1.PATHS.requirements}/). ` +
        `Paso 1/3: análisis con IA…\n`);
    const analysisPrompt = (0, requirementWorkshopPrompt_1.buildAnalysisPrompt)(options.feature, requirement, dbSchema, domainContext);
    let analysisRaw;
    try {
        analysisRaw = await (0, client_1.generateCode)("Arquitecto de requisitos NitroGroups", analysisPrompt);
    }
    catch (e) {
        console.error(`❌ Llamada LLM falló: ${e?.message || e}`);
        return exitCodes_1.ExitCodes.FAILED;
    }
    const analysis = parseAnalysisJson(analysisRaw);
    if (!analysis || analysis.questions.length < 1) {
        console.error("❌ No se pudo extraer un JSON de análisis con 'summary' y 'questions[]'. Vuelve a intentar o acorta el requisito.");
        console.log("\n--- salida recortada ---\n", analysisRaw?.slice(0, 1_200), "\n------------------------\n");
        return exitCodes_1.ExitCodes.FAILED;
    }
    if (analysis.questions.length < 3) {
        console.warn("⚠️  Pocas preguntas generadas; puedes añadir criterio manual al contrato luego.\n");
    }
    console.log("═══════════════════════════════════════");
    console.log(`Resumen: ${analysis.summary}\n`);
    console.log("Preguntas a resolver (responde en consola, una a una):");
    console.log("═══════════════════════════════════════\n");
    const answers = [];
    for (const q of analysis.questions) {
        if (q.context) {
            console.log(`\n[${q.id}] ${q.text}`);
            console.log(`    Contexto: ${q.context}`);
        }
        else {
            console.log(`\n[${q.id}] ${q.text}`);
        }
        const a = await (0, promptLine_1.askLine)("    Tu respuesta: ");
        answers.push({ id: q.id, question: q.text, answer: a || "(sin respuesta)" });
    }
    const qaText = answers
        .map(x => `**${x.id}** P: ${x.question}\n   R: ${x.answer}`)
        .join("\n\n");
    console.log(`\n   Paso 2/3: Sintetizando contrato B2B con IA…\n`);
    const contractPrompt = (0, requirementWorkshopPrompt_1.buildContractSynthesisPrompt)(options.feature, requirement, qaText, dbSchema, domainContext);
    let contractRaw;
    try {
        contractRaw = await (0, client_1.generateCode)("Arquitecto de contrato B2B NitroGroups", contractPrompt);
    }
    catch (e) {
        console.error(`❌ Síntesis de contrato falló: ${e?.message || e}`);
        return exitCodes_1.ExitCodes.FAILED;
    }
    const contractJson = (0, llmJsonExtraction_1.extractJsonObjectFromLlmText)(contractRaw);
    if (!contractJson) {
        console.error("❌ No se pudo extraer JSON del contrato. Revisa la salida o reintenta.");
        console.log(contractRaw?.slice(0, 2_000));
        return exitCodes_1.ExitCodes.FAILED;
    }
    let contract;
    try {
        contract = JSON.parse(contractJson);
    }
    catch {
        console.error("❌ El contrato no es JSON válido.");
        return exitCodes_1.ExitCodes.FAILED;
    }
    contract.feature = options.feature;
    if (!contract.entityHash)
        contract.entityHash = "INITIAL_SIGNATURE";
    if (!contract.v)
        contract.v = "1.0.0";
    const integrity = (0, b2bValidator_1.validateContractIntegrity)(contract);
    if (!integrity.isValid) {
        console.error("❌ Contrato B2B inválido según el validador:");
        integrity.errors.forEach(err => console.error(`   · ${err}`));
        if (integrity.warnings.length) {
            integrity.warnings.forEach(w => console.warn(`   ⚠️  ${w}`));
        }
        console.log("\n--- contrato (para copiar/ajustar) ---\n", JSON.stringify(contract, null, 2).slice(0, 3_000));
        return exitCodes_1.ExitCodes.FAILED;
    }
    integrity.warnings.forEach(w => console.warn(`⚠️  ${w}`));
    const { reconcileB2BContractOrKeepDraft } = await Promise.resolve().then(() => __importStar(require("./reconcileContract")));
    console.log(`\n   Paso 2.5/3: Reconciliación requisito + Q&A ↔ contrato (segunda pasada)…\n`);
    const reconciled = await reconcileB2BContractOrKeepDraft({
        feature: options.feature,
        requirementBody: requirement,
        qaText: qaText,
        draftContract: contract,
        dbSchema: (0, contextExtractor_1.extractDbSchema)() ?? null,
        domainContext: (0, contextExtractor_1.extractDomainContext)(options.feature) ?? null
    });
    contract = reconciled.contract;
    if (reconciled.warning) {
        console.warn(`⚠️  Reconciliación no pudo alinear (LLM/JSON/validación): ${reconciled.warning}\n` +
            `   Se mantiene el contrato de la primera pasada.\n`);
    }
    else if (reconciled.usedReconciled) {
        console.log(`   ✔ Contrato ajustado tras reconciliación con requisito y Q&A.`);
    }
    const integrity2 = (0, b2bValidator_1.validateContractIntegrity)(contract);
    if (!integrity2.isValid) {
        console.error("❌ Tras reconciliación el contrato dejó de ser válido (no debería ocurrir).");
        integrity2.errors.forEach(err => console.error(`   · ${err}`));
        return exitCodes_1.ExitCodes.FAILED;
    }
    integrity2.warnings.forEach(w => console.warn(`⚠️  ${w}`));
    const contractPath = path_1.default.join(process.cwd(), "ai", "contracts", "b2b", `${options.feature}.contract.json`);
    if (fs_1.default.existsSync(contractPath) && !options.force) {
        const go = await (0, diffViewer_1.confirmAction)(`Ya existe ${path_1.default.relative(process.cwd(), contractPath)}. ¿Sobrescribir?`);
        if (!go) {
            console.log("❌ No se guardó. Usa --force o borra el contrato y re-ejecuta.\n");
            return exitCodes_1.ExitCodes.ABORTED;
        }
    }
    const finalAccept = await (0, diffViewer_1.confirmAction)("¿Guardar este contrato y luego generarás código con 'generate-feature'?");
    if (!finalAccept) {
        console.log("Operación cancelada. Puedes copiar y pegar el JSON de arriba si se imprimió.\n");
        return exitCodes_1.ExitCodes.ABORTED;
    }
    fs_1.default.mkdirSync(path_1.default.dirname(contractPath), { recursive: true });
    fs_1.default.writeFileSync(contractPath, JSON.stringify(contract, null, 2), "utf-8");
    await (0, engramClient_1.rememberDecision)(options.feature, "Contrato creado vía requirement-workshop (requisito + Q&A) antes de generate-feature.");
    console.log(`\n✅ Contrato guardado: ${path_1.default.relative(process.cwd(), contractPath)}`);
    console.log(`\nSiguiente paso (generar código, misma consola, raíz del repo):\n` +
        `  npm run ai -- generate-feature ${options.feature} --mode=full-stack\n`);
    return exitCodes_1.ExitCodes.OK;
}
exports.runRequirementWorkshop = runRequirementWorkshop;
