/**
 * Validación B2B estructural, reparación dirigida por issues y, si hace
 * falta, rebuild determinista de backend/frontend. Actualiza `RunSignals`
 * (fallback, `backendDirectedRepair`) como el monolito.
 *
 * Extraído de `generateFeature.ts` — refactor v1.2 Sesión 4.
 */

import { rememberError } from "../../memory/engramClient";
import { validateB2BStructural, summarizeIssues } from "../contract/structuralValidator";
import { repairStructuralIssues } from "../contract/contractRepair";
import { mergeGeneratedFiles } from "../generation/parser";
import { buildDeterministicBackend } from "../generation/backendFallback";
import { applyDeterministicFrontendFallback } from "../generation/frontendFallback";
import type { ModeConfig } from "../pipeline/modes";
import type { RunSignals } from "../pipeline/runVerdict";
import type { FileOutput, B2BContract, OrchestratorMode } from "../types";
import { normalizeToPosix } from "../types";

export async function runStructuralB2BPhase(options: {
    feature: string;
    contract: B2BContract;
    moduleName: string;
    mode: OrchestratorMode;
    modeConfig: ModeConfig;
    signals: RunSignals;
    files: FileOutput[];
    projectRoot: string;
}): Promise<{ ok: true; files: FileOutput[] } | { ok: false }> {
    const { feature, contract, moduleName, mode, modeConfig, signals, projectRoot } = options;
    let generatedFiles = options.files;

    console.log(`\n[🛡️] Validación B2B estructural (Front ↔ Back ↔ Contrato)...`);
    let structural = validateB2BStructural(contract, generatedFiles, {
        includeBackend: modeConfig.validateBackendStructural,
        includeFrontend: modeConfig.validateFrontendStructural,
        frontendEndpointDiskFallback: { projectRoot, feature }
    });

    let repairAttempts = 0;
    while (!structural.ok && repairAttempts < 3) {
        const repair = repairStructuralIssues(generatedFiles, contract, structural.issues);
        if (!repair.changed) break;
        generatedFiles = repair.files;
        repairAttempts++;
        signals.backendDirectedRepair = true;
        console.log(`   [🛠️] Reparación B2B dirigida: ${repair.applied.join(", ")}`);
        structural = validateB2BStructural(contract, generatedFiles, {
            includeBackend: modeConfig.validateBackendStructural,
            includeFrontend: modeConfig.validateFrontendStructural,
            frontendEndpointDiskFallback: { projectRoot, feature }
        });
    }

    if (!structural.ok) {
        console.warn(
            "\n⚠️  DTOs del LLM incompatibles con el contrato. Sustitución: plantilla fija validada con el contrato (fallback)."
        );
        structural.issues.filter(i => i.severity === "error").forEach(i => console.warn(`   - ${i.code}: ${i.message}`));

        const hasBackendIssue = structural.issues.some(i => i.lang === "C#" || i.code === "B2B_BACKEND_ENDPOINT_MISSING");
        const hasFrontendIssue = structural.issues.some(i => i.lang === "TS" || i.code === "B2B_ROUTE_MISMATCH");

        if (modeConfig.generateBackend && hasBackendIssue) {
            const rebuiltBackend = buildDeterministicBackend(feature, contract, moduleName, { projectRoot });
            generatedFiles = mergeGeneratedFiles(
                generatedFiles.filter(f => !normalizeToPosix(f.path).startsWith("Core/")),
                rebuiltBackend
            );
            signals.backendDeterministicFallback = true;
        }
        if (modeConfig.generateFrontend && hasFrontendIssue) {
            generatedFiles = applyDeterministicFrontendFallback(feature, contract, generatedFiles);
            signals.frontendDeterministicFallback = true;
        }

        structural = validateB2BStructural(contract, generatedFiles, {
            includeBackend: modeConfig.validateBackendStructural,
            includeFrontend: modeConfig.validateFrontendStructural,
            frontendEndpointDiskFallback: { projectRoot, feature }
        });
    }

    if (!structural.ok) {
        console.error(`\n💥 FALLO DE COHERENCIA B2B (no se pudo reparar):`);
        console.error(summarizeIssues(structural.issues));
        await rememberError(
            feature,
            "Fallo coherencia B2B post-repair",
            summarizeIssues(structural.issues).substring(0, 4000)
        );
        return { ok: false };
    }
    console.log(`   ✔️ Coherencia B2B garantizada.`);

    return { ok: true, files: generatedFiles };
}
