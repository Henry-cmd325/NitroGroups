"use strict";
/**
 * Fase 0 — Drafting (diseño asistido).
 *
 * Se ejecuta cuando NO existe contrato B2B para el feature. Pide a la IA
 * que proponga preguntas de negocio y un borrador de contrato, lo guarda
 * tras confirmación del usuario y termina el run (no continúa con la
 * generación: requiere una segunda invocación del CLI).
 *
 * Extraída de `generateFeature.ts` en el refactor v1.2 (ver PLAN_V1_2.md §2).
 * No depende del `PipelineContext` porque corre ANTES de que el contexto
 * esté definido (no hay contrato aún).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDraftingPhase = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../../client");
const diffViewer_1 = require("../../utils/diffViewer");
const contextExtractor_1 = require("../../utils/contextExtractor");
const engramClient_1 = require("../../memory/engramClient");
function extractJsonFromResponse(raw) {
    const jsonMatch = raw.match(/```json\n([\s\S]*?)```/);
    if (jsonMatch)
        return jsonMatch[1].trim();
    try {
        JSON.parse(raw);
        return raw.trim();
    }
    catch {
        return null;
    }
}
async function runDraftingPhase(feature) {
    console.log(`\n🧠 ═══ FASE A: DISEÑO INTELIGENTE ═══`);
    console.log(`[📋] No existe contrato B2B para '${feature}'. Iniciando análisis de requerimiento.\n`);
    await (0, engramClient_1.initMemory)();
    const pastDecisions = await (0, engramClient_1.recallDecisions)(feature);
    const pastErrors = await (0, engramClient_1.recallErrors)(feature);
    const dbSchema = (0, contextExtractor_1.extractDbSchema)();
    const domainContext = (0, contextExtractor_1.extractDomainContext)(feature);
    const draftPrompt = `
    Eres un Arquitecto de Software Senior analizando un requerimiento para el proyecto NitroGroups.
    El usuario pide: "Implementar ${feature}"

${pastDecisions.length > 0 ? `
=== DECISIONES PREVIAS RECORDADAS POR ENGRAM ===
Por favor respeta estas decisiones arquitectónicas previamente tomadas:
${pastDecisions.map(d => `- ${d}`).join('\n')}
` : ""}

${pastErrors.length > 0 ? `
=== ERRORES / FRICCIONES YA VISTAS (memoria — no repetir) ===
${pastErrors.slice(0, 10).map(e => `- ${String(e).replace(/\s+/g, " ").slice(0, 420)}`).join("\n")}
` : ""}

${dbSchema ? `
=== SCHEMA DE BASE DE DATOS DEL PROYECTO ===
${dbSchema}
` : "No se encontró schema de BD."}

${domainContext ? `
=== ENTIDADES DE DOMINIO (.NET) YA EXISTENTES ===
${domainContext}
` : "No hay entidades de dominio previas para este feature."}

TU TRABAJO TIENE 2 PARTES:

PARTE 1 - PREGUNTAS DE NEGOCIO:
Genera entre 3 y 6 preguntas CRÍTICAS que el desarrollador DEBE responder antes de implementar.
[QUESTIONS]
1. ¿Pregunta? → Opciones: A) opción1 | B) opción2 | C) opción3
[/QUESTIONS]

PARTE 2 - CONTRATO B2B PROPUESTO:
\`\`\`json
{
  "v": "1.0.0",
  "feature": "${feature}",
  "endpoint": "/api/${feature}",
  "scope": { "allowedEndpoints": ["metodo1"], "allowInternalLogic": true },
  "businessRules": { "precision": "decimal", "notes": "..." },
  "entityHash": "INITIAL_SIGNATURE",
  "methods": [
    {
      "name": "nombreAccion",
      "http": "GET",
      "request": { "name": "RequestDTO", "fields": { "campo": { "type": "string" } } },
      "response": { "name": "ResponseDTO", "fields": { "id": { "type": "number" } } }
    }
  ],
  "auth": true
}
\`\`\`
`;
    const response = await (0, client_1.generateCode)("Eres un Arquitecto de Producto y DDD Senior", draftPrompt);
    console.log("═══════════════════════════════════════");
    console.log(response);
    console.log("═══════════════════════════════════════\n");
    const readQuestions = await (0, diffViewer_1.confirmAction)("¿Revisaste las PREGUNTAS DE NEGOCIO de arriba y, si aplica, las reflejarás (o " +
        "dejarás constancia) en el contrato antes de generar código en un segundo run?");
    if (!readQuestions) {
        console.log("❌ Drafting interrumpido. Responde o documenta criterio, ajusta el JSON si guardas, y re-ejecuta.\n");
        return { saved: false };
    }
    const accept = await (0, diffViewer_1.confirmAction)("¿Deseas guardar este contrato como base? (Podrás editarlo después)");
    if (!accept) {
        console.log("❌ Drafting cancelado.");
        return { saved: false };
    }
    const jsonStr = extractJsonFromResponse(response);
    if (!jsonStr) {
        console.error("❌ La IA no devolvió un bloque JSON válido. Intenta de nuevo.");
        return { saved: false };
    }
    try {
        const contract = JSON.parse(jsonStr);
        contract.v = contract.v || "1.0.0";
        contract.entityHash = contract.entityHash || "INITIAL_SIGNATURE";
        const contractDir = path_1.default.join(__dirname, "../../contracts/b2b");
        fs_1.default.mkdirSync(contractDir, { recursive: true });
        const contractPath = path_1.default.join(contractDir, `${feature}.contract.json`);
        fs_1.default.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
        await (0, engramClient_1.rememberDecision)(feature, `Contrato inicial creado. Hash: ${contract.entityHash}.`);
        console.log(`\n✅ Contrato guardado en: ai/contracts/b2b/${feature}.contract.json`);
        console.log(`🔄 Ejecuta 'npm run ai generate-feature ${feature}' para generar el código.\n`);
        return { saved: true, contractPath };
    }
    catch (e) {
        console.error("❌ No se pudo parsear el JSON del contrato. Revisa la salida manualmente.");
        return { saved: false };
    }
}
exports.runDraftingPhase = runDraftingPhase;
