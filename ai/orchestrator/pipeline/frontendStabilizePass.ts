/**
 * Vuelve a aplicar el normalizador en varias rondas hasta que no haya cambios
 * o se alcance el máximo. Útil cuando un fix (p. ej. import) desbloquea otro
 * (variante Badge) en el mismo archivo.
 */
import { normalizeFrontendOutput, type NormalizeOptions } from "../generation/frontendNormalizer";
import type { FileOutput } from "../types";

const DEFAULT_MAX_ROUNDS = 3;

export type StabilizeOptions = NormalizeOptions & { maxRounds?: number };

export function stabilizeFrontendOutput(
    files: FileOutput[],
    options: StabilizeOptions = {}
): { files: FileOutput[]; changes: string[] } {
    const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS;
    const normOpts: NormalizeOptions = { projectRoot: options.projectRoot, components: options.components };

    let current = files;
    const allChanges: string[] = [];
    for (let r = 0; r < maxRounds; r++) {
        const n = normalizeFrontendOutput(current, normOpts);
        allChanges.push(...n.changes);
        current = n.files;
        if (n.changes.length === 0) break;
    }
    return { files: current, changes: allChanges };
}
