"use strict";
/**
 * Introspección de componentes UI del proyecto (@/components/ui/*).
 *
 * Lee en runtime los .tsx de `UI/nitro-groups/src/components/ui/` y extrae:
 *  - Nombre principal (basename sin extensión).
 *  - Si tiene `export default ...`.
 *  - Qué símbolos expone como named exports (`export { A, B }` o
 *    `export const Foo` / `export function Foo`).
 *  - En el caso de Badge-like: variants válidas (literal union de CVA).
 *
 * Esto sustituye la lista hardcoded `UI_ALIASES` del normalizer, que se
 * desactualizaba cada vez que aparecía un componente nuevo.
 *
 * Estrategia: regex sobre el texto del componente. No es AST real, pero
 * cubre los patrones que el proyecto usa (CVA para variants, export
 * default function/const, export { X, Y }).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildVariantFallback = exports.introspectUiComponents = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const UI_ROOT_RELATIVE = "UI/nitro-groups/src/components/ui";
function extractNamedExports(source, mainName) {
    const named = new Set();
    // `export { A, B, C as D }` ...
    const braceRegex = /export\s*\{\s*([^}]+?)\s*\}/g;
    let match;
    while ((match = braceRegex.exec(source)) !== null) {
        for (const token of match[1].split(",")) {
            const trimmed = token.trim();
            if (!trimmed)
                continue;
            // "Foo as Bar" o "Foo"
            const asMatch = trimmed.match(/^([A-Za-z_][\w]*)\s+as\s+([A-Za-z_][\w]*)$/);
            if (asMatch) {
                named.add(asMatch[2]);
            }
            else if (/^[A-Za-z_][\w]*$/.test(trimmed)) {
                named.add(trimmed);
            }
        }
    }
    // `export const Foo = ...` / `export function Foo(...)` / `export class Foo {}`
    const namedDeclRegex = /export\s+(?:const|function|class|async\s+function|interface|type)\s+([A-Za-z_][\w]*)/g;
    while ((match = namedDeclRegex.exec(source)) !== null) {
        // No contamos la declaración si es inmediatamente precedida por `export default`.
        if (!source.slice(Math.max(0, match.index - 25), match.index).includes("default")) {
            named.add(match[1]);
        }
    }
    // Filtramos interfaces/types (TS-only) que terminan en Props — no son valores importables
    // desde un punto de vista práctico, pero los conservamos porque a veces se usan como tipo.
    named.delete(`${mainName}Props`);
    return Array.from(named);
}
function extractDefaultExport(source) {
    return /export\s+default\b/.test(source);
}
/**
 * Extrae el contenido balanceado a partir de una llave `{` que comienza en
 * `startIndex - 1`. Devuelve el índice del `}` que la cierra, o -1 si no.
 */
function findMatchingBrace(source, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === "{")
            depth++;
        else if (ch === "}") {
            depth--;
            if (depth === 0)
                return i;
        }
    }
    return -1;
}
/**
 * Extrae variants de un bloque CVA — `cva("base", { variants: { variant: { a: ..., b: ... } } })`.
 * Devuelve la lista de claves de `variant`, que es el shape más común para
 * Badge/Button/Alert. Usa balanceo real de llaves para no confundirse con
 * objetos anidados.
 */
function extractCvaVariants(source) {
    const variantHeader = /variant\s*:\s*\{/g;
    let match;
    while ((match = variantHeader.exec(source)) !== null) {
        const openIdx = match.index + match[0].length - 1;
        const closeIdx = findMatchingBrace(source, openIdx);
        if (closeIdx < 0)
            continue;
        // Validación de contexto: debe estar dentro de un `variants: {`.
        const prelude = source.slice(Math.max(0, match.index - 200), match.index);
        if (!/variants\s*:\s*\{/.test(prelude))
            continue;
        const inner = source.slice(openIdx + 1, closeIdx);
        const keys = new Set();
        const keyRegex = /(?:^|,|\n|\{)\s*([A-Za-z_][\w-]*|"[^"]+"|'[^']+')\s*:/g;
        let m;
        while ((m = keyRegex.exec(inner)) !== null) {
            const raw = m[1].replace(/^['"]|['"]$/g, "");
            if (raw)
                keys.add(raw);
        }
        if (keys.size > 0)
            return Array.from(keys);
    }
    return [];
}
/**
 * Introspecta la carpeta completa de componentes UI.
 * Si la carpeta no existe (proyecto sin UI), devuelve lista vacía.
 */
function introspectUiComponents(projectRoot) {
    const uiDir = path_1.default.join(projectRoot, UI_ROOT_RELATIVE);
    if (!fs_1.default.existsSync(uiDir))
        return [];
    const entries = fs_1.default.readdirSync(uiDir, { withFileTypes: true });
    const components = [];
    for (const entry of entries) {
        if (!entry.isFile())
            continue;
        if (!entry.name.toLowerCase().endsWith(".tsx"))
            continue;
        const filePath = path_1.default.join(uiDir, entry.name);
        const basename = entry.name.replace(/\.tsx$/i, "");
        const source = fs_1.default.readFileSync(filePath, "utf-8");
        const hasDefault = extractDefaultExport(source);
        const namedExports = extractNamedExports(source, basename);
        const variants = extractCvaVariants(source);
        components.push({
            path: `@/components/ui/${basename}`,
            filePath,
            name: basename,
            hasDefault,
            namedExports,
            variants: variants.length > 0 ? variants : undefined
        });
    }
    return components;
}
exports.introspectUiComponents = introspectUiComponents;
/**
 * Mapeo de variants inválidas → equivalente válida.
 * Usa las variants del Badge real como referencia de sustitución; si Badge
 * cambia sus variants, el normalizer se auto-ajusta.
 */
function buildVariantFallback(validVariants) {
    const fallback = {};
    const has = (v) => validVariants.includes(v);
    const pick = (...candidates) => candidates.find(has) || validVariants[0] || "default";
    // Equivalencias semánticas comunes que el LLM inventa.
    fallback["success"] = pick("secondary", "outline", "default");
    fallback["info"] = pick("outline", "secondary", "default");
    fallback["warning"] = pick("secondary", "outline", "default");
    fallback["error"] = pick("destructive", "secondary", "default");
    fallback["danger"] = pick("destructive", "secondary", "default");
    fallback["primary"] = pick("default");
    return fallback;
}
exports.buildVariantFallback = buildVariantFallback;
