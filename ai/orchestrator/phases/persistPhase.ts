/**
 * Fase — Confirmación, reconciliación de huérfanos, escritura a disco y
 * quality gate final (con rollback de archivos y de reconcile).
 *
 * Si el QG final falla, aplica el mismo flujo de reporte/veredicto parcial
 * que el monolito (rememberError, `buildVerdictReport`, `stampSandboxVerdict`,
 * `printVerdictReport`).
 *
 * La fase de verdict “feliz” (`runVerdictPhase`) queda en el caller tras
 * `ok: true` — allí viven success.json / Engram / handler realism.
 *
 * Ver refactor v1.2 — Sesión 5.
 */

import fs from "fs";
import path from "path";

import { confirmAction } from "../../utils/diffViewer";
import { rememberError } from "../../memory/engramClient";
import {
    planReconciliation,
    executeReconciliation,
    rollbackReconciliation,
    type ReconcileResult
} from "../pipeline/fileReconciler";
import { runQualityGates, type QualityBaseline } from "../pipeline/qualityGatesCore";
import { rollbackWrittenFiles } from "./autoRepairLoopPhase";
import { buildVerdictReport, printVerdictReport, type RunSignals } from "../pipeline/runVerdict";
import { stampSandboxVerdict } from "../pipeline/sandbox";
import { normalizeToPosix, type FileOutput, type OrchestratorMode } from "../types";

export type PersistPhaseResult =
    | { ok: true; reconcileResult: ReconcileResult }
    | { ok: false; reason: "user-aborted" }
    | { ok: false; reason: "quality-gate-failed"; detail: string };

export interface PersistToDiskInput {
    feature: string;
    moduleName: string;
    mode: OrchestratorMode;
    generatedFiles: FileOutput[];
    baseline: QualityBaseline;
    signals: RunSignals;
    /** Directorio del snapshot (para sellar el sandbox en fallo o si el usuario cancela). */
    sandboxDir: string;
    projectRoot?: string;
}

/**
 * Pregunta al usuario, reconcilia huérfanos, escribe archivos y corre el
 * quality gate final. No llama a `runVerdictPhase`.
 */
export async function runPersistToDiskPhase(input: PersistToDiskInput): Promise<PersistPhaseResult> {
    const { feature, moduleName, mode, generatedFiles, baseline, signals, sandboxDir } = input;
    const projectRoot = input.projectRoot ?? process.cwd();

    const save = await confirmAction(`\n¿Escribir los ${generatedFiles.length} archivos en la arquitectura real?`);
    if (!save) {
        console.log("❌ Operación abortada.");
        stampSandboxVerdict(sandboxDir, "aborted-by-user");
        return { ok: false, reason: "user-aborted" };
    }

    const reconcilePlan = planReconciliation({
        feature,
        moduleName,
        projectRoot,
        targetFiles: generatedFiles
    });
    let reconcileResult: ReconcileResult = { orphansDeleted: [], backup: new Map() };
    if (reconcilePlan.orphans.length > 0) {
        console.log(`\n[🧹] Reconciliando archivos huérfanos (${reconcilePlan.orphans.length})...`);
        reconcilePlan.orphans.slice(0, 5).forEach(orphan => {
            const rel = path.relative(projectRoot, orphan);
            console.log(`   ✂️  ${rel}`);
        });
        if (reconcilePlan.orphans.length > 5) {
            console.log(`   ✂️  ... y ${reconcilePlan.orphans.length - 5} más.`);
        }
        reconcileResult = executeReconciliation(reconcilePlan);
    }

    const writtenFiles = new Map<string, string | null>();
    try {
        for (const file of generatedFiles) {
            const fullPath = path.isAbsolute(file.path) ? file.path : path.join(projectRoot, file.path);
            const previousContent = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf-8") : null;
            writtenFiles.set(fullPath, previousContent);

            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, file.content);
            // Sin emoji en la misma línea que la ruta: en consola Windows a veces se corrompe el render.
            const rel = normalizeToPosix(path.relative(projectRoot, fullPath));
            console.log(`  ok  ${rel}`);
        }

        console.log(`\n[🧪] Ejecutando Quality Gates finales...`);
        const qualityResult = runQualityGates(feature, baseline, mode);
        if (!qualityResult.ok) {
            throw new Error(qualityResult.details || "Quality gate fallido");
        }
        console.log(`   ✔️ Quality Gates superados.`);
        signals.qualityGatesFinalOk = true;
    } catch (error: any) {
        rollbackWrittenFiles(writtenFiles);
        rollbackReconciliation(reconcileResult);
        signals.rolledBack = true;
        const details = error?.message || "Error desconocido";
        console.error(`\n💥 Quality Gate FAILED. Se revirtieron todos los archivos generados.`);
        console.error(`   Detalle: ${details.substring(0, 1500)}\n`);
        await rememberError(feature, "Quality Gate fallido", details.substring(0, 4000));
        const failedReport = buildVerdictReport(feature, mode, signals);
        stampSandboxVerdict(sandboxDir, failedReport.verdict);
        printVerdictReport(failedReport);
        return { ok: false, reason: "quality-gate-failed", detail: details.substring(0, 500) };
    }

    return { ok: true, reconcileResult };
}
