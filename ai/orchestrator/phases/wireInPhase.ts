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

import { planFrontendWireIn } from "../generation/frontendWireIn";
import { mergeGeneratedFiles } from "../generation/parser";
import { normalizeToPosix, type FileOutput } from "../types";

export interface WireInPhaseInput {
    feature: string;
    projectRoot: string;
    generatedFiles: FileOutput[];
    skipIfExists?: boolean;
}

export interface WireInPhaseResult {
    files: FileOutput[];
    addedWireInFiles: number;
    routePath: string | null;
    skippedReason: string | null;
}

export function runWireInPhase(input: WireInPhaseInput): WireInPhaseResult {
    const uiFiles = input.generatedFiles.filter(f => normalizeToPosix(f.path).startsWith("UI/"));
    const wireIn = planFrontendWireIn(
        {
            feature: input.feature,
            projectRoot: input.projectRoot,
            skipIfExists: input.skipIfExists ?? true,
        },
        uiFiles
    );

    let files = input.generatedFiles;
    if (wireIn.files.length > 0) {
        files = mergeGeneratedFiles(input.generatedFiles, wireIn.files);
        console.log(`   🔌 Wire-in: ${wireIn.files[0].path} (ruta '${wireIn.routePath}').`);
    } else if (wireIn.skipped) {
        console.log(`   ℹ️  Wire-in omitido: ${wireIn.skipped}`);
    }

    return {
        files,
        addedWireInFiles: wireIn.files.length,
        routePath: wireIn.routePath ?? null,
        skippedReason: wireIn.skipped ?? null,
    };
}
