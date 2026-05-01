"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPersistToDiskPhase = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const diffViewer_1 = require("../../utils/diffViewer");
const engramClient_1 = require("../../memory/engramClient");
const fileReconciler_1 = require("../pipeline/fileReconciler");
const qualityGatesCore_1 = require("../pipeline/qualityGatesCore");
const autoRepairLoopPhase_1 = require("./autoRepairLoopPhase");
const runVerdict_1 = require("../pipeline/runVerdict");
const sandbox_1 = require("../pipeline/sandbox");
const types_1 = require("../types");
/**
 * Pregunta al usuario, reconcilia huérfanos, escribe archivos y corre el
 * quality gate final. No llama a `runVerdictPhase`.
 */
async function runPersistToDiskPhase(input) {
    const { feature, moduleName, mode, generatedFiles, baseline, signals, sandboxDir } = input;
    const projectRoot = input.projectRoot ?? process.cwd();
    const save = await (0, diffViewer_1.confirmAction)(`\n¿Escribir los ${generatedFiles.length} archivos en la arquitectura real?`);
    if (!save) {
        console.log("❌ Operación abortada.");
        (0, sandbox_1.stampSandboxVerdict)(sandboxDir, "aborted-by-user");
        return { ok: false, reason: "user-aborted" };
    }
    const reconcilePlan = (0, fileReconciler_1.planReconciliation)({
        feature,
        moduleName,
        projectRoot,
        targetFiles: generatedFiles
    });
    let reconcileResult = { orphansDeleted: [], backup: new Map() };
    if (reconcilePlan.orphans.length > 0) {
        console.log(`\n[🧹] Reconciliando archivos huérfanos (${reconcilePlan.orphans.length})...`);
        reconcilePlan.orphans.slice(0, 5).forEach(orphan => {
            const rel = path_1.default.relative(projectRoot, orphan);
            console.log(`   ✂️  ${rel}`);
        });
        if (reconcilePlan.orphans.length > 5) {
            console.log(`   ✂️  ... y ${reconcilePlan.orphans.length - 5} más.`);
        }
        reconcileResult = (0, fileReconciler_1.executeReconciliation)(reconcilePlan);
    }
    const writtenFiles = new Map();
    try {
        for (const file of generatedFiles) {
            const fullPath = path_1.default.isAbsolute(file.path) ? file.path : path_1.default.join(projectRoot, file.path);
            const previousContent = fs_1.default.existsSync(fullPath) ? fs_1.default.readFileSync(fullPath, "utf-8") : null;
            writtenFiles.set(fullPath, previousContent);
            fs_1.default.mkdirSync(path_1.default.dirname(fullPath), { recursive: true });
            fs_1.default.writeFileSync(fullPath, file.content);
            // Sin emoji en la misma línea que la ruta: en consola Windows a veces se corrompe el render.
            const rel = (0, types_1.normalizeToPosix)(path_1.default.relative(projectRoot, fullPath));
            console.log(`  ok  ${rel}`);
        }
        console.log(`\n[🧪] Ejecutando Quality Gates finales...`);
        const qualityResult = (0, qualityGatesCore_1.runQualityGates)(feature, baseline, mode);
        if (!qualityResult.ok) {
            throw new Error(qualityResult.details || "Quality gate fallido");
        }
        console.log(`   ✔️ Quality Gates superados.`);
        signals.qualityGatesFinalOk = true;
    }
    catch (error) {
        (0, autoRepairLoopPhase_1.rollbackWrittenFiles)(writtenFiles);
        (0, fileReconciler_1.rollbackReconciliation)(reconcileResult);
        signals.rolledBack = true;
        const details = error?.message || "Error desconocido";
        console.error(`\n💥 Quality Gate FAILED. Se revirtieron todos los archivos generados.`);
        console.error(`   Detalle: ${details.substring(0, 1500)}\n`);
        await (0, engramClient_1.rememberError)(feature, "Quality Gate fallido", details.substring(0, 4000));
        const failedReport = (0, runVerdict_1.buildVerdictReport)(feature, mode, signals);
        (0, sandbox_1.stampSandboxVerdict)(sandboxDir, failedReport.verdict);
        (0, runVerdict_1.printVerdictReport)(failedReport);
        return { ok: false, reason: "quality-gate-failed", detail: details.substring(0, 500) };
    }
    return { ok: true, reconcileResult };
}
exports.runPersistToDiskPhase = runPersistToDiskPhase;
