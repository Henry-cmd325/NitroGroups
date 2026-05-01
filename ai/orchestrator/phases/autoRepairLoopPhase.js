"use strict";
/**
 * Quality gates con rollback en disco + loop de autocorrección (LLM repair
 * + fallbacks deterministas + opción full-stack a frontend-only).
 *
 * Extraído de `generateFeature.ts` — refactor v1.2 Sesión 4.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAutoRepairLoop = exports.validateFilesWithRollback = exports.rollbackWrittenFiles = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../../client");
const parser_1 = require("../generation/parser");
const frontendFallback_1 = require("../generation/frontendFallback");
const backendFallback_1 = require("../generation/backendFallback");
const frontendStabilizePass_1 = require("../pipeline/frontendStabilizePass");
const qualityGatesCore_1 = require("../pipeline/qualityGatesCore");
const modes_1 = require("../pipeline/modes");
const types_1 = require("../types");
const generatedOutputPhase_1 = require("./generatedOutputPhase");
function rollbackWrittenFiles(writtenFiles) {
    for (const [filePath, previousContent] of writtenFiles.entries()) {
        if (previousContent === null) {
            if (fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
            continue;
        }
        fs_1.default.writeFileSync(filePath, previousContent);
    }
}
exports.rollbackWrittenFiles = rollbackWrittenFiles;
function validateFilesWithRollback(files, feature, baseline, mode) {
    const writtenFiles = new Map();
    try {
        for (const file of files) {
            const fullPath = path_1.default.isAbsolute(file.path) ? file.path : path_1.default.join(process.cwd(), file.path);
            const previousContent = fs_1.default.existsSync(fullPath) ? fs_1.default.readFileSync(fullPath, "utf-8") : null;
            writtenFiles.set(fullPath, previousContent);
            fs_1.default.mkdirSync(path_1.default.dirname(fullPath), { recursive: true });
            fs_1.default.writeFileSync(fullPath, file.content);
        }
        return (0, qualityGatesCore_1.runQualityGates)(feature, baseline, mode);
    }
    finally {
        rollbackWrittenFiles(writtenFiles);
    }
}
exports.validateFilesWithRollback = validateFilesWithRollback;
async function runAutoRepairLoop(feature, moduleName, initialFiles, baseline, contract, mode) {
    const projectRoot = process.cwd();
    let workingFiles = [...initialFiles];
    const maxRepairAttempts = 2;
    const modeConfig = (0, modes_1.getModeConfig)(mode);
    const stats = {
        llmRounds: 0,
        backendFallbackActivated: false,
        frontendFallbackActivated: false,
        backendDiscarded: false
    };
    for (let attempt = 0; attempt <= maxRepairAttempts; attempt++) {
        const validation = validateFilesWithRollback(workingFiles, feature, baseline, mode);
        if (validation.ok) {
            if (attempt > 0)
                console.log(`   ✔️ Autocorrección exitosa en intento ${attempt}/${maxRepairAttempts}.`);
            return { ok: true, files: workingFiles, stats };
        }
        const errorSummary = validation.details || "Error desconocido";
        console.warn(`\n⚠️  Intento de validación ${attempt + 1}/${maxRepairAttempts + 1} falló.`);
        console.warn(errorSummary);
        if (attempt === maxRepairAttempts) {
            let fallbackFiles = [...workingFiles];
            if (modeConfig.generateFrontend) {
                fallbackFiles = (0, frontendFallback_1.applyDeterministicFrontendFallback)(feature, contract, fallbackFiles);
                stats.frontendFallbackActivated = true;
            }
            const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
            if (fallbackValidation.ok) {
                console.log(`   ✔️ Fallback determinista frontend aplicado.`);
                return { ok: true, files: fallbackFiles, stats };
            }
            if (modeConfig.generateBackend && (fallbackValidation.newDotnetErrors || []).length > 0) {
                const backendDeterministic = (0, backendFallback_1.buildDeterministicBackend)(feature, contract, moduleName, { projectRoot });
                stats.backendFallbackActivated = true;
                const filesWithBoth = (0, parser_1.mergeGeneratedFiles)(fallbackFiles.filter(file => !(0, types_1.normalizeToPosix)(file.path).startsWith("Core/")), backendDeterministic);
                const bothValidation = validateFilesWithRollback(filesWithBoth, feature, baseline, mode);
                if (bothValidation.ok) {
                    console.log(`   ✔️ Fallback determinista backend+frontend aplicado.`);
                    return { ok: true, files: filesWithBoth, stats };
                }
                if (mode === "full-stack") {
                    const frontendOnly = fallbackFiles.filter(file => (0, types_1.normalizeToPosix)(file.path).startsWith("UI/"));
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
            const repairedRaw = await (0, client_1.generateCode)("Fix-first Executor: Senior Fullstack Repair Bot", repairPrompt);
            const repairedFiles = (0, parser_1.parseMultiFileOutput)(repairedRaw);
            if (repairedFiles.length === 0) {
                console.warn(`⚠️  La IA no devolvió patch. Aplicando fallback determinista...`);
                const fallbackFiles = modeConfig.generateFrontend
                    ? (0, frontendFallback_1.applyDeterministicFrontendFallback)(feature, contract, workingFiles)
                    : workingFiles;
                if (modeConfig.generateFrontend)
                    stats.frontendFallbackActivated = true;
                const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
                if (fallbackValidation.ok) {
                    return { ok: true, files: fallbackFiles, stats };
                }
                workingFiles = fallbackFiles;
                continue;
            }
            workingFiles = (0, parser_1.mergeGeneratedFiles)(workingFiles, repairedFiles);
            const sanRepair = (0, generatedOutputPhase_1.sanitizeProtectedFiles)(moduleName, workingFiles, feature);
            workingFiles = sanRepair.files;
            if (sanRepair.droppedPaths.length > 0) {
                console.warn(`   [🛡️] Se descartaron rutas inseguras del repair LLM (Abstractions, use case suelto, etc.):`);
                sanRepair.droppedPaths.forEach(p => console.warn(`      → ${p}`));
            }
            if (modeConfig.generateFrontend) {
                const renorm = (0, frontendStabilizePass_1.stabilizeFrontendOutput)(workingFiles, { maxRounds: 3 });
                if (renorm.changes.length > 0)
                    workingFiles = renorm.files;
            }
        }
        catch (error) {
            const reason = error?.message || "Error desconocido en autocorrección IA";
            console.warn(`⚠️  Autocorrección IA no disponible: ${reason}`);
            const fallbackFiles = modeConfig.generateFrontend
                ? (0, frontendFallback_1.applyDeterministicFrontendFallback)(feature, contract, workingFiles)
                : workingFiles;
            if (modeConfig.generateFrontend)
                stats.frontendFallbackActivated = true;
            const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
            if (fallbackValidation.ok) {
                return { ok: true, files: fallbackFiles, stats };
            }
            return { ok: false, files: workingFiles, lastError: fallbackValidation.details || reason, stats };
        }
    }
    return { ok: false, files: workingFiles, lastError: "Autocorrección agotada.", stats };
}
exports.runAutoRepairLoop = runAutoRepairLoop;
