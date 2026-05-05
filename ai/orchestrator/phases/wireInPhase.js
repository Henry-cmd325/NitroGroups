"use strict";
/**
 * Fase — Wire-in frontend.
 *
 * Envuelve `planFrontendWireIn` agregando el logging estándar y
 * devolviendo la lista final de archivos. La lógica pura sigue viviendo
 * en `generation/frontendWireIn.ts`; esta fase solo es una fachada
 * para mantener `generateFeature.ts` delgado.
 *
 * Extraída en el refactor v1.2.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWireInPhase = void 0;
const frontendWireIn_1 = require("../generation/frontendWireIn");
const parser_1 = require("../generation/parser");
const types_1 = require("../types");
function runWireInPhase(input) {
    const uiFiles = input.generatedFiles.filter(f => (0, types_1.normalizeToPosix)(f.path).startsWith("UI/"));
    const wireIn = (0, frontendWireIn_1.planFrontendWireIn)({
        feature: input.feature,
        projectRoot: input.projectRoot,
        skipIfExists: input.skipIfExists ?? true,
    }, uiFiles);
    let files = input.generatedFiles;
    if (wireIn.files.length > 0) {
        files = (0, parser_1.mergeGeneratedFiles)(input.generatedFiles, wireIn.files);
        console.log(`   🔌 Wire-in: ${wireIn.files[0].path} (ruta '${wireIn.routePath}').`);
    }
    else if (wireIn.skipped) {
        console.log(`   ℹ️  Wire-in omitido: ${wireIn.skipped}`);
    }
    return {
        files,
        addedWireInFiles: wireIn.files.length,
        routePath: wireIn.routePath ?? null,
        skippedReason: wireIn.skipped ?? null,
    };
}
exports.runWireInPhase = runWireInPhase;
