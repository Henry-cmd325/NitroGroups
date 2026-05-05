"use strict";
/**
 * Fase — Invocación LLM (backend + frontend), parseo multi-archivo y
 * fallbacks deterministas cuando la respuesta está vacía o falla.
 *
 * El `RunSignals` se muta igual que en el monolito original (flags de
 * LLM, fallback, errores).
 *
 * Tras juntar back+front, si sigue faltando la capa esperada, aplica
 * `buildDeterministicBackend` o `applyDeterministicFrontendFallback`
 * (misma semántica que `generateFeature.ts` pre-refactor).
 *
 * Ver refactor v1.2 — Sesión 3.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLlmGenerationPhase = void 0;
const client_1 = require("../../client");
const backendArchitecturePrompt_1 = require("../../prompts/backendArchitecturePrompt");
const frontendArchitecturePrompt_1 = require("../../prompts/frontendArchitecturePrompt");
const engramClient_1 = require("../../memory/engramClient");
const parser_1 = require("../generation/parser");
const backendFallback_1 = require("../generation/backendFallback");
const frontendFallback_1 = require("../generation/frontendFallback");
const types_1 = require("../types");
function hasPathPrefix(files, prefix) {
    return files.some(f => (0, types_1.normalizeToPosix)(f.path).startsWith(prefix));
}
async function runLlmGenerationPhase(input) {
    const { feature, contract, moduleName, domainContext, modeConfig, signals, lessonContext, projectRoot } = input;
    const contractStr = JSON.stringify(contract, null, 2);
    const suffix = lessonContext.backendLessonBlock + lessonContext.decisionContextTemplate;
    const suffixFront = lessonContext.frontendLessonBlock + lessonContext.decisionContextTemplate;
    const backFiles = [];
    const frontFiles = [];
    if (modeConfig.generateBackend) {
        console.log(`\n[🚀] Generando Backend (.NET Vertical Slices)...`);
        let promptBack = (0, backendArchitecturePrompt_1.getBackendArchitecturePrompt)(contractStr, domainContext, moduleName);
        promptBack += suffix;
        signals.backendLlmCalled = true;
        try {
            const rawBack = await (0, client_1.generateCode)("Disciplined Executor: Arquitecto .NET Senior", promptBack);
            const parsed = (0, parser_1.parseMultiFileOutput)(rawBack);
            if (parsed.length > 0) {
                backFiles.push(...parsed);
                signals.backendLlmSucceeded = true;
            }
            else {
                console.warn(`   ⚠️  Respuesta LLM sin archivos parseables. Aplicando fallback determinista.`);
                backFiles.push(...(0, backendFallback_1.buildDeterministicBackend)(feature, contract, moduleName, { projectRoot }));
                signals.backendDeterministicFallback = true;
            }
        }
        catch (error) {
            const details = error?.message || "Error desconocido durante generación backend";
            console.warn(`\n⚠️  GENERACIÓN BACKEND IA FALLÓ: ${details}`);
            console.warn(`   → Aplicando backend determinista como base.`);
            backFiles.push(...(0, backendFallback_1.buildDeterministicBackend)(feature, contract, moduleName, { projectRoot }));
            signals.backendDeterministicFallback = true;
            await (0, engramClient_1.rememberError)(feature, "Fallback backend determinista aplicado", details.substring(0, 4000));
        }
    }
    if (modeConfig.generateFrontend) {
        console.log(`[🚀] Generando Frontend (React/TypeScript)...`);
        let promptFront = (0, frontendArchitecturePrompt_1.getFrontendArchitecturePrompt)(contractStr, { projectRoot });
        promptFront += suffixFront;
        signals.frontendLlmCalled = true;
        try {
            const rawFront = await (0, client_1.generateCode)("Disciplined Executor: Arquitecto React Senior", promptFront);
            const parsed = (0, parser_1.parseMultiFileOutput)(rawFront);
            if (parsed.length > 0) {
                frontFiles.push(...parsed);
                signals.frontendLlmSucceeded = true;
            }
            else {
                console.warn(`   ⚠️  Respuesta LLM sin archivos parseables. Se aplicará fallback determinista más adelante.`);
            }
        }
        catch (error) {
            const details = error?.message || "Error desconocido durante generación frontend";
            console.warn(`\n⚠️  GENERACIÓN FRONTEND IA FALLÓ: ${details}`);
            console.warn(`   → Aplicando frontend determinista como base.`);
        }
    }
    let generatedFiles = [...backFiles, ...frontFiles];
    if (modeConfig.generateBackend && !hasPathPrefix(generatedFiles, "Core/")) {
        generatedFiles.push(...(0, backendFallback_1.buildDeterministicBackend)(feature, contract, moduleName, { projectRoot }));
        signals.backendDeterministicFallback = true;
    }
    if (modeConfig.generateFrontend && !hasPathPrefix(generatedFiles, "UI/")) {
        generatedFiles = (0, frontendFallback_1.applyDeterministicFrontendFallback)(feature, contract, generatedFiles);
        signals.frontendDeterministicFallback = true;
    }
    return { files: generatedFiles };
}
exports.runLlmGenerationPhase = runLlmGenerationPhase;
