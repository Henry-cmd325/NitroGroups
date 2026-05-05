"use strict";
/**
 * Reconciliación de archivos generados ↔ archivos en disco.
 *
 * Problema que resuelve:
 * Durante el pipeline el LLM puede escribir archivos en rutas A/B/C y luego
 * el fallback determinista los reemplaza con archivos en rutas D/E/F. Si el
 * pipeline solo escribe D/E/F sin tocar A/B/C, estos últimos quedan
 * huérfanos en disco (por ejemplo: un `ListHandler.cs` del LLM que queda al
 * lado del `Get/GetHandler.cs` correcto del fallback). Con el tiempo eso
 * produce build rot y archivos confusos en el repo.
 *
 * Estrategia:
 * 1) Calculamos las carpetas "propias" de la feature (scopes):
 *    - `Core/<Module>/**.Application/UseCases/<FeaturePascal>/`
 *    - `Core/<Module>/**.Infrastructure/Endpoints/<FeaturePascal>/`
 *    - `UI/nitro-groups/src/features/<feature>/`
 * 2) Listamos los .cs/.ts/.tsx bajo esos scopes.
 * 3) Los que no están en el set final `targetFiles` son huérfanos.
 * 4) Los borramos ANTES de escribir el set final y los registramos, para que
 *    el rollback pueda restaurarlos si el quality gate final falla.
 *
 * El reconciliador NUNCA toca:
 *  - Entidades de dominio (Core/<Module>/**.Domain/Entities/)
 *  - Rutas `src/app/<feature>/page.tsx` que existían previamente (wire-in
 *    ya las respeta por su cuenta).
 *  - Cualquier archivo fuera de los scopes declarados.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollbackReconciliation = exports.executeReconciliation = exports.planReconciliation = exports.computeScopes = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
const DEFAULT_EXTENSIONS = [".cs", ".ts", ".tsx"];
function walkFiles(rootDir, extensions) {
    if (!fs_1.default.existsSync(rootDir))
        return [];
    const results = [];
    const stack = [rootDir];
    while (stack.length > 0) {
        const current = stack.pop();
        let entries;
        try {
            entries = fs_1.default.readdirSync(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const full = path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(full);
                continue;
            }
            if (!entry.isFile())
                continue;
            if (extensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
                results.push(full);
            }
        }
    }
    return results;
}
function absoluteScope(projectRoot, relative) {
    return path_1.default.resolve(projectRoot, relative);
}
function computeScopes(options) {
    const { feature, moduleName, projectRoot } = options;
    const featurePascal = (0, types_1.toPascalCase)(feature);
    const scopes = [];
    if (moduleName) {
        const moduleCore = path_1.default.join(projectRoot, "Core", moduleName);
        if (fs_1.default.existsSync(moduleCore)) {
            const appRoot = path_1.default.join(moduleCore, `NitroGroups.Core.${moduleName}.Application`);
            const infraRoot = path_1.default.join(moduleCore, `NitroGroups.Core.${moduleName}.Infrastructure`);
            scopes.push(path_1.default.join(appRoot, "UseCases", featurePascal));
            scopes.push(path_1.default.join(infraRoot, "Endpoints", featurePascal));
        }
    }
    scopes.push(absoluteScope(projectRoot, `UI/nitro-groups/src/features/${feature}`));
    return scopes.filter(s => !!s);
}
exports.computeScopes = computeScopes;
function planReconciliation(options) {
    const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
    const scopes = computeScopes(options);
    // Normalizamos las rutas del set final a absolutas para compararlas.
    const targetAbsolute = new Set(options.targetFiles.map(file => {
        const normalized = (0, types_1.normalizeToPosix)(file.path);
        const abs = path_1.default.isAbsolute(normalized)
            ? normalized
            : path_1.default.resolve(options.projectRoot, normalized);
        return path_1.default.resolve(abs); // normaliza separadores
    }));
    const orphans = [];
    for (const scope of scopes) {
        const onDisk = walkFiles(scope, extensions);
        for (const filePath of onDisk) {
            const resolved = path_1.default.resolve(filePath);
            if (!targetAbsolute.has(resolved)) {
                orphans.push(resolved);
            }
        }
    }
    return { orphans, scopes };
}
exports.planReconciliation = planReconciliation;
/**
 * Ejecuta el plan: borra huérfanos y guarda backup para rollback eventual.
 * El backup incluye el contenido previo de cada huérfano, para poder
 * restaurar si el quality gate final falla.
 */
function executeReconciliation(plan) {
    const backup = new Map();
    const deleted = [];
    for (const orphan of plan.orphans) {
        try {
            const content = fs_1.default.readFileSync(orphan, "utf-8");
            backup.set(orphan, content);
            fs_1.default.unlinkSync(orphan);
            deleted.push(orphan);
        }
        catch {
            // archivo ya no existe o no es legible; lo ignoramos.
        }
    }
    return { orphansDeleted: deleted, backup };
}
exports.executeReconciliation = executeReconciliation;
/** Restaura huérfanos borrados (invocar solo si hay que revertir). */
function rollbackReconciliation(result) {
    for (const [filePath, content] of result.backup.entries()) {
        if (content === null)
            continue;
        try {
            fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
            fs_1.default.writeFileSync(filePath, content, "utf-8");
        }
        catch {
            // ignore: mejor dejar logs arriba que fallar el rollback completo.
        }
    }
}
exports.rollbackReconciliation = rollbackReconciliation;
