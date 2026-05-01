"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planFrontendWireIn = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
const APP_ROOT = "UI/nitro-groups/src/app";
/** Nombre fijo del archivo de ruta en App Router (evita typos al mostrar el log). */
const NEXT_PAGE_FILENAME = "page.tsx";
/**
 * Crea una page.tsx en `src/app/<feature>/page.tsx` que importa y renderiza el
 * Panel generado por la feature. Si la ruta ya existe, respeta la existente.
 * No toca el sidebar del dashboard (eso requiere introspección específica del
 * proyecto que se puede añadir más adelante).
 */
function planFrontendWireIn(options, generatedFrontend) {
    const { feature, projectRoot, skipIfExists } = options;
    const featurePascal = (0, types_1.toPascalCase)(feature);
    // Solo tiene sentido hacer wire-in si la feature generó el componente Panel.
    const panelFile = generatedFrontend.find(f => (0, types_1.normalizeToPosix)(f.path).endsWith(`/components/${featurePascal}Panel.tsx`));
    if (!panelFile) {
        return { files: [], skipped: `No se encontró componente ${featurePascal}Panel.tsx; se omite wire-in.` };
    }
    const pageDir = path_1.default.join(projectRoot, APP_ROOT, feature.toLowerCase());
    const pagePath = path_1.default.join(pageDir, NEXT_PAGE_FILENAME);
    const relativePath = path_1.default.relative(projectRoot, pagePath).replace(/\\/g, "/");
    if (skipIfExists && fs_1.default.existsSync(pagePath)) {
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
      <${featurePascal}Panel />
    </main>
  );
}
`;
    return {
        files: [{ path: relativePath, content }],
        routePath: `/${feature.toLowerCase()}`
    };
}
exports.planFrontendWireIn = planFrontendWireIn;
