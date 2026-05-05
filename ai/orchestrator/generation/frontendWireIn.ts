import fs from "fs";
import path from "path";
import { FileOutput, toPascalCase, normalizeToPosix } from "../types";

export interface WireInOptions {
    feature: string;
    projectRoot: string;
    /** Si no existe la página pero la ruta ya está ocupada, no la pisamos. */
    skipIfExists: boolean;
}

export interface WireInResult {
    /** Archivo(s) adicionales que el pipeline debe escribir. */
    files: FileOutput[];
    /** Motivo si no se generó nada. */
    skipped?: string;
    /** Ruta lógica en Next.js donde quedará la feature. */
    routePath?: string;
}

const APP_ROOT = "UI/nitro-groups/src/app";
/** Nombre fijo del archivo de ruta en App Router (evita typos al mostrar el log). */
const NEXT_PAGE_FILENAME = "page.tsx";

/**
 * Crea una page.tsx en `src/app/<feature>/page.tsx` que importa y renderiza el
 * Panel generado por la feature. Si la ruta ya existe, respeta la existente.
 * No toca el sidebar del dashboard (eso requiere introspección específica del
 * proyecto que se puede añadir más adelante).
 */
export function planFrontendWireIn(options: WireInOptions, generatedFrontend: FileOutput[]): WireInResult {
    const { feature, projectRoot, skipIfExists } = options;
    const featurePascal = toPascalCase(feature);

    // Solo tiene sentido hacer wire-in si la feature generó el componente Panel.
    const panelFile = generatedFrontend.find(f => normalizeToPosix(f.path).endsWith(`/components/${featurePascal}Panel.tsx`));
    if (!panelFile) {
        return { files: [], skipped: `No se encontró componente ${featurePascal}Panel.tsx; se omite wire-in.` };
    }

    const pageDir = path.join(projectRoot, APP_ROOT, feature.toLowerCase());
    const pagePath = path.join(pageDir, NEXT_PAGE_FILENAME);
    const relativePath = path.relative(projectRoot, pagePath).replace(/\\/g, "/");

    if (skipIfExists && fs.existsSync(pagePath)) {
        // No imprimir ruta larga con `.../app/gr`+`oup…`: al partir línea se lee
        // "grroup…". El nombre de la feature ya sale arriba en el run.
        return {
            files: [],
            skipped: "Carpeta `src/app/<feature>/` (App Router) ya creada. Fichero de ruta: no se reemplaza."
        };
    }

    // El normalizer determinista (frontendNormalizer.ts) garantiza que todo
    // Panel generado tenga `export default <FeaturePascal>Panel` al final.
    // Aun así, hacemos detección defensiva: si por alguna razón no hay default,
    // caemos a named import.
    const panelContent = panelFile.content || "";
    const hasDefaultExport = /export\s+default\b/.test(panelContent);

    const importStatement = hasDefaultExport
        ? `import ${featurePascal}Panel from "@/features/${feature}/components/${featurePascal}Panel";`
        : `import { ${featurePascal}Panel } from "@/features/${feature}/components/${featurePascal}Panel";`;

    // `groupId?: number` no casa con el patrón (hay `?` antes de `:`).
    // Si el panel declara `groupId: number`, inyecta prop o TS falla (TS2741) al
    // montar <Panel /> sin args. `0` suele mapear a “selecciona grupo” en el panel;
    // el usuario puede afinar la page con ?groupId= (App Router) después.
    const panelHasRequiredGroupId = /^\s*groupId:\s*number/m.test(panelContent);
    const panelLine = panelHasRequiredGroupId
        ? `      <${featurePascal}Panel groupId={0} />`
        : `      <${featurePascal}Panel />`;

    const content = `${importStatement}
export default function ${featurePascal}Page() {
  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">${featurePascal}</h1>
        <p className="text-sm text-gray-400">
          Vista generada automáticamente por el orquestador.
        </p>
      </header>
${panelLine}
    </main>
  );
}
`;

    return {
        files: [{ path: relativePath, content }],
        routePath: `/${feature.toLowerCase()}`
    };
}
