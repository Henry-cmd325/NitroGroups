"use strict";
/**
 * Validación B2B estructural, reparación dirigida por issues y, si hace
 * falta, rebuild determinista de backend/frontend. Actualiza `RunSignals`
 * (fallback, `backendDirectedRepair`) como el monolito.
 *
 * Extraído de `generateFeature.ts` — refactor v1.2 Sesión 4.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStructuralB2BPhase = void 0;
const engramClient_1 = require("../../memory/engramClient");
const structuralValidator_1 = require("../contract/structuralValidator");
const contractRepair_1 = require("../contract/contractRepair");
const parser_1 = require("../generation/parser");
const backendFallback_1 = require("../generation/backendFallback");
const frontendFallback_1 = require("../generation/frontendFallback");
const types_1 = require("../types");
async function runStructuralB2BPhase(options) {
    const { feature, contract, moduleName, mode, modeConfig, signals, projectRoot } = options;
    let generatedFiles = options.files;
    console.log(`\n[🛡️] Validación B2B estructural (Front ↔ Back ↔ Contrato)...`);
    let structural = (0, structuralValidator_1.validateB2BStructural)(contract, generatedFiles, {
        includeBackend: modeConfig.validateBackendStructural,
        includeFrontend: modeConfig.validateFrontendStructural
    });
    let repairAttempts = 0;
    while (!structural.ok && repairAttempts < 3) {
        const repair = (0, contractRepair_1.repairStructuralIssues)(generatedFiles, contract, structural.issues);
        if (!repair.changed)
            break;
        generatedFiles = repair.files;
        repairAttempts++;
        signals.backendDirectedRepair = true;
        console.log(`   [🛠️] Reparación B2B dirigida: ${repair.applied.join(", ")}`);
        structural = (0, structuralValidator_1.validateB2BStructural)(contract, generatedFiles, {
            includeBackend: modeConfig.validateBackendStructural,
            includeFrontend: modeConfig.validateFrontendStructural
        });
    }
    if (!structural.ok) {
        console.warn("\n⚠️  DTOs del LLM incompatibles con el contrato. Sustitución: plantilla fija validada con el contrato (fallback).");
        structural.issues.filter(i => i.severity === "error").forEach(i => console.warn(`   - ${i.code}: ${i.message}`));
        const hasBackendIssue = structural.issues.some(i => i.lang === "C#" || i.code === "B2B_BACKEND_ENDPOINT_MISSING");
        const hasFrontendIssue = structural.issues.some(i => i.lang === "TS" || i.code === "B2B_ROUTE_MISMATCH");
        if (modeConfig.generateBackend && hasBackendIssue) {
            const rebuiltBackend = (0, backendFallback_1.buildDeterministicBackend)(feature, contract, moduleName, { projectRoot });
            generatedFiles = (0, parser_1.mergeGeneratedFiles)(generatedFiles.filter(f => !(0, types_1.normalizeToPosix)(f.path).startsWith("Core/")), rebuiltBackend);
            signals.backendDeterministicFallback = true;
        }
        if (modeConfig.generateFrontend && hasFrontendIssue) {
            generatedFiles = (0, frontendFallback_1.applyDeterministicFrontendFallback)(feature, contract, generatedFiles);
            signals.frontendDeterministicFallback = true;
        }
        structural = (0, structuralValidator_1.validateB2BStructural)(contract, generatedFiles, {
            includeBackend: modeConfig.validateBackendStructural,
            includeFrontend: modeConfig.validateFrontendStructural
        });
    }
    if (!structural.ok) {
        console.error(`\n💥 FALLO DE COHERENCIA B2B (no se pudo reparar):`);
        console.error((0, structuralValidator_1.summarizeIssues)(structural.issues));
        await (0, engramClient_1.rememberError)(feature, "Fallo coherencia B2B post-repair", (0, structuralValidator_1.summarizeIssues)(structural.issues).substring(0, 4000));
        return { ok: false };
    }
    console.log(`   ✔️ Coherencia B2B garantizada.`);
    return { ok: true, files: generatedFiles };
}
exports.runStructuralB2BPhase = runStructuralB2BPhase;
