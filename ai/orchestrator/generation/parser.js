"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeGeneratedFiles = exports.parseMultiFileOutput = void 0;
const types_1 = require("../types");
/** Algunos modelos escriben `[FILE: path]` creyendo en el parámetro OpenAPI "in: path" — no es una ruta. */
const PLACEHOLDER_FILE_PATHS = new Set([
    "path",
    "file",
    "filename",
    "filepath",
    "ruta",
    "archivo",
    "...",
    "todo"
].map(s => s.toLowerCase()));
function isPlausibleFilePath(p) {
    const t = p.trim();
    if (t.length < 4)
        return false;
    const lower = t.toLowerCase();
    if (PLACEHOLDER_FILE_PATHS.has(lower))
        return false;
    if (!t.includes("/") && !/\.(cs|tsx?|json|md)$/i.test(t))
        return false;
    return true;
}
/**
 * Parsea la respuesta multi-archivo del LLM.
 * Formato esperado: `[FILE: ruta/al/archivo]` seguido de un bloque markdown.
 *
 * Si el modelo repite el mismo `[FILE: ...]`, se conserva el **último** bloque (misma clave, último gana),
 * para no disparar "Ruta duplicada" en la validación.
 * Bloques con ruta placeholder ("path", "file", etc.) se omiten.
 */
function parseMultiFileOutput(raw) {
    const byPath = new Map();
    const regex = /\[FILE:\s*([^\]]+)\][\s\S]*?```[\w-]*\s*\n([\s\S]*?)\n```/gi;
    let match;
    while ((match = regex.exec(raw)) !== null) {
        const path = (0, types_1.normalizeToPosix)(match[1].trim().replace(/\*/g, ""));
        if (!isPlausibleFilePath(path)) {
            continue;
        }
        const key = path.toLowerCase();
        byPath.set(key, { path, content: match[2].trim() });
    }
    return Array.from(byPath.values());
}
exports.parseMultiFileOutput = parseMultiFileOutput;
function mergeGeneratedFiles(baseFiles, patchedFiles) {
    const map = new Map();
    for (const file of baseFiles)
        map.set((0, types_1.normalizeToPosix)(file.path).toLowerCase(), file);
    for (const file of patchedFiles)
        map.set((0, types_1.normalizeToPosix)(file.path).toLowerCase(), file);
    return Array.from(map.values());
}
exports.mergeGeneratedFiles = mergeGeneratedFiles;
