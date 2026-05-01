/**
 * Quality gates con rollback en disco + loop de autocorrección (LLM repair
 * + fallbacks deterministas + opción full-stack a frontend-only).
 *
 * Extraído de `generateFeature.ts` — refactor v1.2 Sesión 4.
 */

import fs from "fs";
import path from "path";

import { generateCode } from "../../client";
import { parseMultiFileOutput, mergeGeneratedFiles } from "../generation/parser";
import { applyDeterministicFrontendFallback } from "../generation/frontendFallback";
import { buildDeterministicBackend } from "../generation/backendFallback";
import { stabilizeFrontendOutput } from "../pipeline/frontendStabilizePass";
import type { QualityBaseline } from "../pipeline/qualityGatesCore";
import { runQualityGates } from "../pipeline/qualityGatesCore";
import { getModeConfig } from "../pipeline/modes";
import type { FileOutput, B2BContract, OrchestratorMode } from "../types";
import { normalizeToPosix } from "../types";
import { sanitizeProtectedFiles } from "./generatedOutputPhase";

// Re-export type for callers
export type { QualityBaseline } from "../pipeline/qualityGatesCore";

export function rollbackWrittenFiles(writtenFiles: Map<string, string | null>): void {
    for (const [filePath, previousContent] of writtenFiles.entries()) {
        if (previousContent === null) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            continue;
        }
        fs.writeFileSync(filePath, previousContent);
    }
}

export function validateFilesWithRollback(
    files: FileOutput[],
    feature: string,
    baseline: QualityBaseline,
    mode: OrchestratorMode
): { ok: boolean; details?: string; newTypeScriptErrors?: string[]; newDotnetErrors?: string[] } {
    const writtenFiles = new Map<string, string | null>();
    try {
        for (const file of files) {
            const fullPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
            const previousContent = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf-8") : null;
            writtenFiles.set(fullPath, previousContent);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, file.content);
        }

        return runQualityGates(feature, baseline, mode);
    } finally {
        rollbackWrittenFiles(writtenFiles);
    }
}

export interface RepairLoopResult {
    ok: boolean;
    files: FileOutput[];
    lastError?: string;
    stats: {
        llmRounds: number;
        backendFallbackActivated: boolean;
        frontendFallbackActivated: boolean;
        backendDiscarded: boolean;
    };
}

export async function runAutoRepairLoop(
    feature: string,
    moduleName: string,
    initialFiles: FileOutput[],
    baseline: QualityBaseline,
    contract: B2BContract,
    mode: OrchestratorMode
): Promise<RepairLoopResult> {
    const projectRoot = process.cwd();
    let workingFiles = [...initialFiles];
    const maxRepairAttempts = 2;
    const modeConfig = getModeConfig(mode);
    const stats = {
        llmRounds: 0,
        backendFallbackActivated: false,
        frontendFallbackActivated: false,
        backendDiscarded: false
    };

    for (let attempt = 0; attempt <= maxRepairAttempts; attempt++) {
        const validation = validateFilesWithRollback(workingFiles, feature, baseline, mode);
        if (validation.ok) {
            if (attempt > 0) console.log(`   ✔️ Autocorrección exitosa en intento ${attempt}/${maxRepairAttempts}.`);
            return { ok: true, files: workingFiles, stats };
        }

        const errorSummary = validation.details || "Error desconocido";
        console.warn(`\n⚠️  Intento de validación ${attempt + 1}/${maxRepairAttempts + 1} falló.`);
        console.warn(errorSummary);

        if (attempt === maxRepairAttempts) {
            let fallbackFiles = [...workingFiles];
            if (modeConfig.generateFrontend) {
                fallbackFiles = applyDeterministicFrontendFallback(feature, contract, fallbackFiles);
                stats.frontendFallbackActivated = true;
            }

            const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
            if (fallbackValidation.ok) {
                console.log(`   ✔️ Fallback determinista frontend aplicado.`);
                return { ok: true, files: fallbackFiles, stats };
            }

            if (modeConfig.generateBackend && (fallbackValidation.newDotnetErrors || []).length > 0) {
                const backendDeterministic = buildDeterministicBackend(feature, contract, moduleName, { projectRoot });
                stats.backendFallbackActivated = true;
                const filesWithBoth = mergeGeneratedFiles(
                    fallbackFiles.filter(file => !normalizeToPosix(file.path).startsWith("Core/")),
                    backendDeterministic
                );
                const bothValidation = validateFilesWithRollback(filesWithBoth, feature, baseline, mode);
                if (bothValidation.ok) {
                    console.log(`   ✔️ Fallback determinista backend+frontend aplicado.`);
                    return { ok: true, files: filesWithBoth, stats };
                }

                if (mode === "full-stack") {
                    const frontendOnly = fallbackFiles.filter(file => normalizeToPosix(file.path).startsWith("UI/"));
                    const frontendOnlyValidation = validateFilesWithRollback(frontendOnly, feature, baseline, mode);
                    if (frontendOnlyValidation.ok) {
                        console.warn(`   ⚠️  Backend descartado por errores críticos; se entregará frontend-only.`);
                        stats.backendDiscarded = true;
                        return { ok: true, files: frontendOnly, stats };
                    }
                }

                return { ok: false, files: workingFiles, lastError: bothValidation.details || errorSummary, stats };
            }

            return { ok: false, files: workingFiles, lastError: fallbackValidation.details || errorSummary, stats };
        }

        console.log(`[🛠️] Intentando autocorrección IA (${attempt + 1}/${maxRepairAttempts})...`);
        stats.llmRounds++;
        const repairPrompt = `
Eres un reparador senior full-stack. Debes corregir archivos generados para el feature "${feature}" (módulo backend: "${moduleName}").

ERRORES NUEVOS DETECTADOS:
${errorSummary}

ARCHIVOS ACTUALES A CORREGIR:
${workingFiles.map(file => `[FILE: ${file.path}]\n\`\`\`\n${file.content}\n\`\`\``).join("\n\n")}

REGLAS:
1) Devuelve SOLO archivos corregidos en formato [FILE: path] + bloque markdown.
2) Corrige exactamente los errores reportados.
3) NO cambies rutas de archivo.
4) En frontend usa @tanstack/react-query v5: useQuery({ queryKey, queryFn, ... }) con UN solo argumento-objeto; NUNCA useQuery(key, fn) ni 3 argumentos.
5) Tipa correctamente data/error/queries para evitar unknown/{}.
6) No introduzcas dependencias nuevas.
7) C#: IGroupAvailabilityRepository : IGenericRepository<GroupAvailability, long>. GetAllAsync() SIN parámetros. GetByIdAsync, FindAsync, GetAvailabilitiesByGroupIdAsync(...). NUNCA modifiques archivos bajo /Application/Abstractions/ ni inventes nombres de repositorio.
8) NUNCA devuelvas I*Repository.cs en Abstractions; nunca un handler .cs suelto en UseCases/<Feature>/ (sin carpeta Get/Create/…).
9) Si el error proviene de tests (dotnet test / npm test), ajusta la lógica o el test para alinear con el contrato; no deshabilites tests sin criterio.
`;

        try {
            const repairedRaw = await generateCode("Fix-first Executor: Senior Fullstack Repair Bot", repairPrompt);
            const repairedFiles = parseMultiFileOutput(repairedRaw);
            if (repairedFiles.length === 0) {
                console.warn(`⚠️  La IA no devolvió patch. Aplicando fallback determinista...`);
                const fallbackFiles = modeConfig.generateFrontend
                    ? applyDeterministicFrontendFallback(feature, contract, workingFiles)
                    : workingFiles;
                if (modeConfig.generateFrontend) stats.frontendFallbackActivated = true;
                const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
                if (fallbackValidation.ok) {
                    return { ok: true, files: fallbackFiles, stats };
                }
                workingFiles = fallbackFiles;
                continue;
            }
            workingFiles = mergeGeneratedFiles(workingFiles, repairedFiles);
            const sanRepair = sanitizeProtectedFiles(moduleName, workingFiles, feature);
            workingFiles = sanRepair.files;
            if (sanRepair.droppedPaths.length > 0) {
                console.warn(`   [🛡️] Se descartaron rutas inseguras del repair LLM (Abstractions, use case suelto, etc.):`);
                sanRepair.droppedPaths.forEach(p => console.warn(`      → ${p}`));
            }
            if (modeConfig.generateFrontend) {
                const renorm = stabilizeFrontendOutput(workingFiles, { maxRounds: 3 });
                if (renorm.changes.length > 0) workingFiles = renorm.files;
            }
        } catch (error: any) {
            const reason = error?.message || "Error desconocido en autocorrección IA";
            console.warn(`⚠️  Autocorrección IA no disponible: ${reason}`);
            const fallbackFiles = modeConfig.generateFrontend
                ? applyDeterministicFrontendFallback(feature, contract, workingFiles)
                : workingFiles;
            if (modeConfig.generateFrontend) stats.frontendFallbackActivated = true;
            const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
            if (fallbackValidation.ok) {
                return { ok: true, files: fallbackFiles, stats };
            }
            return { ok: false, files: workingFiles, lastError: fallbackValidation.details || reason, stats };
        }
    }

    return { ok: false, files: workingFiles, lastError: "Autocorrección agotada.", stats };
}
