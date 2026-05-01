import { FileOutput, normalizeToPosix } from "../types";

/** Algunos modelos escriben `[FILE: path]` creyendo en el parámetro OpenAPI "in: path" — no es una ruta. */
const PLACEHOLDER_FILE_PATHS = new Set(
    [
        "path",
        "file",
        "filename",
        "filepath",
        "ruta",
        "archivo",
        "...",
        "todo"
    ].map(s => s.toLowerCase())
);

function isPlausibleFilePath(p: string): boolean {
    const t = p.trim();
    if (t.length < 4) return false;
    const lower = t.toLowerCase();
    if (PLACEHOLDER_FILE_PATHS.has(lower)) return false;
    if (!t.includes("/") && !/\.(cs|tsx?|json|md)$/i.test(t)) return false;
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
export function parseMultiFileOutput(raw: string): FileOutput[] {
    const byPath = new Map<string, FileOutput>();
    const regex = /\[FILE:\s*([^\]]+)\][\s\S]*?```[\w-]*\s*\n([\s\S]*?)\n```/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
        const path = normalizeToPosix(match[1].trim().replace(/\*/g, ""));
        if (!isPlausibleFilePath(path)) {
            continue;
        }
        const key = path.toLowerCase();
        byPath.set(key, { path, content: match[2].trim() });
    }
    return Array.from(byPath.values());
}

export function mergeGeneratedFiles(baseFiles: FileOutput[], patchedFiles: FileOutput[]): FileOutput[] {
    const map = new Map<string, FileOutput>();
    for (const file of baseFiles) map.set(normalizeToPosix(file.path).toLowerCase(), file);
    for (const file of patchedFiles) map.set(normalizeToPosix(file.path).toLowerCase(), file);
    return Array.from(map.values());
}
