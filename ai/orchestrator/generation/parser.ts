import { FileOutput, normalizeToPosix } from "../types";

/**
 * Parsea la respuesta multi-archivo del LLM.
 * Formato esperado: `[FILE: ruta/al/archivo]` seguido de un bloque markdown.
 */
export function parseMultiFileOutput(raw: string): FileOutput[] {
    const files: FileOutput[] = [];
    const regex = /\[FILE:\s*([^\]]+)\][\s\S]*?```[\w-]*\s*\n([\s\S]*?)\n```/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
        files.push({
            path: match[1].trim().replace(/\*/g, ""),
            content: match[2].trim()
        });
    }
    return files;
}

export function mergeGeneratedFiles(baseFiles: FileOutput[], patchedFiles: FileOutput[]): FileOutput[] {
    const map = new Map<string, FileOutput>();
    for (const file of baseFiles) map.set(normalizeToPosix(file.path).toLowerCase(), file);
    for (const file of patchedFiles) map.set(normalizeToPosix(file.path).toLowerCase(), file);
    return Array.from(map.values());
}
