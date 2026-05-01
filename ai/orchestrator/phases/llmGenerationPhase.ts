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

import { generateCode } from "../../client";
import { getBackendArchitecturePrompt } from "../../prompts/backendArchitecturePrompt";
import { getFrontendArchitecturePrompt } from "../../prompts/frontendArchitecturePrompt";
import { rememberError } from "../../memory/engramClient";

import { parseMultiFileOutput } from "../generation/parser";
import { buildDeterministicBackend } from "../generation/backendFallback";
import { applyDeterministicFrontendFallback } from "../generation/frontendFallback";
import type { ModeConfig } from "../pipeline/modes";
import type { FileOutput, B2BContract } from "../types";
import { normalizeToPosix } from "../types";
import type { RunSignals } from "../pipeline/runVerdict";
import type { PromptLessonContext } from "./promptContextPhase";

function hasPathPrefix(files: FileOutput[], prefix: string): boolean {
    return files.some(f => normalizeToPosix(f.path).startsWith(prefix));
}

export interface LlmGenerationPhaseInput {
    feature: string;
    contract: B2BContract;
    moduleName: string;
    domainContext: string | null;
    modeConfig: ModeConfig;
    signals: RunSignals;
    /** Salida de `buildPromptLessonContext`. */
    lessonContext: Pick<PromptLessonContext, "backendLessonBlock" | "frontendLessonBlock" | "decisionContextTemplate">;
    projectRoot: string;
}

export interface LlmGenerationPhaseResult {
    files: FileOutput[];
}

export async function runLlmGenerationPhase(
    input: LlmGenerationPhaseInput
): Promise<LlmGenerationPhaseResult> {
    const {
        feature,
        contract,
        moduleName,
        domainContext,
        modeConfig,
        signals,
        lessonContext,
        projectRoot
    } = input;

    const contractStr = JSON.stringify(contract, null, 2);
    const suffix = lessonContext.backendLessonBlock + lessonContext.decisionContextTemplate;
    const suffixFront = lessonContext.frontendLessonBlock + lessonContext.decisionContextTemplate;

    const backFiles: FileOutput[] = [];
    const frontFiles: FileOutput[] = [];

    if (modeConfig.generateBackend) {
        console.log(`\n[🚀] Generando Backend (.NET Vertical Slices)...`);
        let promptBack = getBackendArchitecturePrompt(contractStr, domainContext, moduleName);
        promptBack += suffix;
        signals.backendLlmCalled = true;
        try {
            const rawBack = await generateCode("Disciplined Executor: Arquitecto .NET Senior", promptBack);
            const parsed = parseMultiFileOutput(rawBack);
            if (parsed.length > 0) {
                backFiles.push(...parsed);
                signals.backendLlmSucceeded = true;
            } else {
                console.warn(`   ⚠️  Respuesta LLM sin archivos parseables. Aplicando fallback determinista.`);
                backFiles.push(...buildDeterministicBackend(feature, contract, moduleName, { projectRoot }));
                signals.backendDeterministicFallback = true;
            }
        } catch (error: any) {
            const details = error?.message || "Error desconocido durante generación backend";
            console.warn(`\n⚠️  GENERACIÓN BACKEND IA FALLÓ: ${details}`);
            console.warn(`   → Aplicando backend determinista como base.`);
            backFiles.push(...buildDeterministicBackend(feature, contract, moduleName, { projectRoot }));
            signals.backendDeterministicFallback = true;
            await rememberError(feature, "Fallback backend determinista aplicado", details.substring(0, 4000));
        }
    }

    if (modeConfig.generateFrontend) {
        console.log(`[🚀] Generando Frontend (React/TypeScript)...`);
        let promptFront = getFrontendArchitecturePrompt(contractStr, { projectRoot });
        promptFront += suffixFront;
        signals.frontendLlmCalled = true;
        try {
            const rawFront = await generateCode("Disciplined Executor: Arquitecto React Senior", promptFront);
            const parsed = parseMultiFileOutput(rawFront);
            if (parsed.length > 0) {
                frontFiles.push(...parsed);
                signals.frontendLlmSucceeded = true;
            } else {
                console.warn(`   ⚠️  Respuesta LLM sin archivos parseables. Se aplicará fallback determinista más adelante.`);
            }
        } catch (error: any) {
            const details = error?.message || "Error desconocido durante generación frontend";
            console.warn(`\n⚠️  GENERACIÓN FRONTEND IA FALLÓ: ${details}`);
            console.warn(`   → Aplicando frontend determinista como base.`);
        }
    }

    let generatedFiles: FileOutput[] = [...backFiles, ...frontFiles];

    if (modeConfig.generateBackend && !hasPathPrefix(generatedFiles, "Core/")) {
        generatedFiles.push(...buildDeterministicBackend(feature, contract, moduleName, { projectRoot }));
        signals.backendDeterministicFallback = true;
    }
    if (modeConfig.generateFrontend && !hasPathPrefix(generatedFiles, "UI/")) {
        generatedFiles = applyDeterministicFrontendFallback(feature, contract, generatedFiles);
        signals.frontendDeterministicFallback = true;
    }

    return { files: generatedFiles };
}
