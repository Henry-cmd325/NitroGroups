"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stabilizeFrontendOutput = void 0;
/**
 * Vuelve a aplicar el normalizador en varias rondas hasta que no haya cambios
 * o se alcance el máximo. Útil cuando un fix (p. ej. import) desbloquea otro
 * (variante Badge) en el mismo archivo.
 */
const frontendNormalizer_1 = require("../generation/frontendNormalizer");
const DEFAULT_MAX_ROUNDS = 3;
function stabilizeFrontendOutput(files, options = {}) {
    const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS;
    const normOpts = { projectRoot: options.projectRoot, components: options.components };
    let current = files;
    const allChanges = [];
    for (let r = 0; r < maxRounds; r++) {
        const n = (0, frontendNormalizer_1.normalizeFrontendOutput)(current, normOpts);
        allChanges.push(...n.changes);
        current = n.files;
        if (n.changes.length === 0)
            break;
    }
    return { files: current, changes: allChanges };
}
exports.stabilizeFrontendOutput = stabilizeFrontendOutput;
