/**
 * Normalizador determinista de salida LLM frontend.
 *
 * Fixes quirúrgicos aplicados ANTES de la validación B2B y del quality gate,
 * para corregir los errores más comunes que el LLM introduce aunque el prompt
 * se los prohíba explícitamente. Preserva toda la lógica/JSX del LLM;
 * solo toca imports y props inválidas.
 *
 * Casos cubiertos:
 *  1) Imports named de componentes que son default export.
 *  2) Imports default de componentes que NO tienen default export.
 *  3) Named imports fantasma (p.ej. CardHeader que no existe).
 *  4) Variants inválidas en componentes CVA (Badge, Button con variants).
 *  5) Uso de <Componente> sin import cuando sí existe en el proyecto.
 *  6) Standardización del Panel a default export.
 *  7) api-client y auth: el proyecto exporta `apiClient` y `getApiAccessToken`
 *     como NAMED exports; el LLM a veces emite `import X from` (default) y
 *     TypeScript falla. Se reescriben a `import { X } from "..."`.
 *  8) useQuery v4 (2-3 args) → v5 (objeto único); y Panel: `data.map` cuando
 *     el contrato no es un array (TypeScript ve `{}`).
 *
 * La tabla de componentes UI se construye por INTROSPECCIÓN del directorio
 * `UI/nitro-groups/src/components/ui/` en runtime. Si añades un componente
 * nuevo, el normalizer lo aprende sin tocar código.
 */

import { FileOutput, normalizeToPosix } from "../types";
import { introspectUiComponents, UiComponent, buildVariantFallback } from "./uiComponentIntrospector";

interface NormalizationResult {
    content: string;
    changes: string[];
}

interface NormalizerContext {
    components: UiComponent[];
    /** Mapa nombre → componente para lookup rápido en JSX. */
    componentsByName: Map<string, UiComponent>;
    /** Componente con CVA variants, típicamente Badge. */
    variantsOwner: UiComponent | null;
    variantFallback: Record<string, string>;
}

function buildContext(components: UiComponent[]): NormalizerContext {
    const byName = new Map<string, UiComponent>();
    for (const c of components) byName.set(c.name, c);

    // El componente con variants más clásico es Badge, pero si en el futuro
    // otros tienen variants reconocibles, tomamos el primero como referencia.
    const variantsOwner = components.find(c => c.name === "Badge" && c.variants && c.variants.length > 0)
        || components.find(c => c.variants && c.variants.length > 0)
        || null;

    const validVariants = variantsOwner?.variants ?? [];
    const variantFallback = buildVariantFallback(validVariants);

    return { components, componentsByName: byName, variantsOwner, variantFallback };
}

function normalizeImports(content: string, ctx: NormalizerContext): NormalizationResult {
    let result = content;
    const changes: string[] = [];

    for (const comp of ctx.components) {
        const escapedPath = comp.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Caso: named import cuando sí hay default → cambia a default.
        if (comp.hasDefault) {
            const namedRegex = new RegExp(
                `import\\s*\\{\\s*([^}]+?)\\s*\\}\\s*from\\s*["']${escapedPath}["'];?`,
                "g"
            );
            result = result.replace(namedRegex, (match, inner) => {
                const imported = String(inner).split(",").map((s: string) => s.trim()).filter(Boolean);
                const mainName = comp.name;

                const hasMain = imported.some((n: string) => {
                    const base = n.split(" as ")[0].trim();
                    return base === mainName;
                });

                const extraNamed = imported.filter((n: string) => {
                    const base = n.split(" as ")[0].trim();
                    return base !== mainName && comp.namedExports.includes(base);
                });

                const invalidNamed = imported.filter((n: string) => {
                    const base = n.split(" as ")[0].trim();
                    return base !== mainName && !comp.namedExports.includes(base);
                });

                if (invalidNamed.length > 0) {
                    changes.push(`descartados imports inexistentes de ${comp.path}: ${invalidNamed.join(", ")}`);
                }

                const parts: string[] = [];
                if (hasMain || invalidNamed.length > 0) {
                    parts.push(`import ${mainName} from "${comp.path}";`);
                    if (hasMain) changes.push(`${comp.path} → default import (${mainName}).`);
                }
                if (extraNamed.length > 0) {
                    parts.push(`import { ${extraNamed.join(", ")} } from "${comp.path}";`);
                }
                return parts.join("\n") || match;
            });
        }

        // Caso: default import cuando NO hay default → cambia a named.
        if (!comp.hasDefault && comp.namedExports.length > 0) {
            const defaultRegex = new RegExp(
                `import\\s+([A-Za-z_][\\w]*)\\s+from\\s+["']${escapedPath}["'];?`,
                "g"
            );
            result = result.replace(defaultRegex, (_match, localName) => {
                const local = String(localName);
                // Elegimos el named export que mejor representa el componente principal.
                const mainNamed = comp.namedExports.find(n => n === comp.name) ?? comp.namedExports[0];
                changes.push(`${comp.path} → named import { ${mainNamed} }.`);
                if (local === mainNamed) {
                    return `import { ${mainNamed} } from "${comp.path}";`;
                }
                return `import { ${mainNamed} as ${local} } from "${comp.path}";`;
            });
        }
    }

    return { content: result, changes };
}

/**
 * @/lib/api-client y @/services/auth.service solo tienen named exports.
 */
function normalizeProjectNamedLibImports(content: string): NormalizationResult {
    let result = content;
    const changes: string[] = [];
    const beforeApi = result;
    result = result.replace(
        /import\s+apiClient\s+from\s+["']@\/lib\/api-client["'];\s*/g,
        'import { apiClient } from "@/lib/api-client";\n'
    );
    if (result !== beforeApi) {
        changes.push(`@/lib/api-client: default import → import { apiClient }`);
    }
    const beforeAuth = result;
    result = result.replace(
        /import\s+getApiAccessToken\s+from\s+["']@\/services\/auth\.service["'];\s*/g,
        'import { getApiAccessToken } from "@/services/auth.service";\n'
    );
    if (result !== beforeAuth) {
        changes.push(`@/services/auth.service: default import → import { getApiAccessToken }`);
    }
    return { content: result, changes };
}

/** Paréntesis equilibrado en la posición de `(` (soporta comillas, escapa \\). */
function extractMatchingParenGroup(source: string, openIdx: number): { inner: string; closeIdx: number } | null {
    if (source[openIdx] !== "(") return null;
    let depth = 0;
    let inStr: null | '"' | "'" | "`" = null;
    for (let i = openIdx; i < source.length; i++) {
        const c = source[i]!;
        if (inStr) {
            if (c === "\\" && i + 1 < source.length) {
                i++;
                continue;
            }
            if (c === inStr) inStr = null;
            continue;
        }
        if (c === '"' || c === "'" || c === "`") {
            inStr = c;
            continue;
        }
        if (c === "(") depth++;
        else if (c === ")") {
            depth--;
            if (depth === 0) {
                return { inner: source.slice(openIdx + 1, i), closeIdx: i + 1 };
            }
        }
    }
    return null;
}

function splitTopLevelArgList(input: string): string[] {
    const args: string[] = [];
    let buf = "";
    let depth = 0;
    let inStr: null | '"' | "'" | "`" = null;
    for (let i = 0; i < input.length; i++) {
        const c = input[i]!;
        if (inStr) {
            buf += c;
            if (c === "\\" && i + 1 < input.length) {
                buf += input[i + 1]!;
                i++;
                continue;
            }
            if (c === inStr) inStr = null;
            continue;
        }
        if (c === '"' || c === "'" || c === "`") {
            buf += c;
            inStr = c;
            continue;
        }
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        if (c === "," && depth === 0) {
            args.push(buf.trim());
            buf = "";
            continue;
        }
        buf += c;
    }
    if (buf.trim()) args.push(buf.trim());
    return args;
}

/**
 * Convierte useQuery (estilo v4) a TanStack v5. Si ya es useQuery({ ... }), no toca.
 */
function normalizeUseQueryLegacyToV5(content: string, filePath: string): NormalizationResult {
    // Case-insensitive: el LLM a veces emite `UseGroupAvailability.ts` y el
    // regex estricto no aplicaba, dejando useQuery v4 (3 args) y TS2554 en v5.
    if (!/\/hooks\/use[^/]+\.ts$/i.test(normalizeToPosix(filePath))) {
        return { content, changes: [] };
    }
    const changes: string[] = [];
    let out = content;
    let searchFrom = 0;
    while (searchFrom < out.length) {
        const i = out.indexOf("useQuery", searchFrom);
        if (i === -1) break;
        if (i > 0 && /[A-Za-z0-9_]/.test(out[i - 1]!)) {
            searchFrom = i + 1;
            continue;
        }
        let p = i + 8;
        while (p < out.length && /\s/.test(out[p]!)) p++;
        let gen = "";
        if (out[p] === "<") {
            const e = out.indexOf(">", p);
            if (e === -1) {
                searchFrom = i + 1;
                continue;
            }
            gen = out.slice(p, e + 1);
            p = e + 1;
        }
        while (p < out.length && /\s/.test(out[p]!)) p++;
        if (out[p] !== "(") {
            searchFrom = i + 1;
            continue;
        }
        const ext = extractMatchingParenGroup(out, p);
        if (!ext) {
            searchFrom = i + 1;
            continue;
        }
        const inner = ext.inner;
        if (/^\s*\{/.test(inner)) {
            searchFrom = p + 1;
            continue;
        }
        const args = splitTopLevelArgList(inner);
        if (args.length !== 2 && args.length !== 3) {
            searchFrom = p + 1;
            continue;
        }
        let replacement: string;
        if (args.length === 2) {
            replacement = `useQuery${gen}({\n  queryKey: ${args[0]!.trim()},\n  queryFn: ${args[1]!.trim()}\n})`;
        } else {
            const a3 = args[2]!.trim();
            const innerOpt = a3.startsWith("{") && a3.endsWith("}") ? a3.slice(1, -1).trim() : a3;
            replacement = `useQuery${gen}({\n  queryKey: ${args[0]!.trim()},\n  queryFn: ${args[1]!.trim()},\n  ${innerOpt}\n})`;
        }
        out = out.slice(0, i) + replacement + out.slice(ext.closeIdx);
        changes.push("useQuery: v4 (2-3 args) → TanStack v5 objeto único");
        searchFrom = i + replacement.length;
    }
    return { content: out, changes };
}

/**
 * Evita .map en variables que a menudo son un DTO único (TS infiere {}) y
 * el LLM pone .map; cubre nombres habituales además de `data`.
 */
function normalizePanelDataMap(content: string, filePath: string): NormalizationResult {
    if (!/\/components\/.*Panel\.tsx$/.test(normalizeToPosix(filePath))) {
        return { content, changes: [] };
    }
    const re =
        /\b(data|rows|items|list|result|results|groupAvailabilities|availabilities|groups)\.map\s*\(/g;
    if (!re.test(content)) return { content, changes: [] };
    re.lastIndex = 0;
    const next = content.replace(re, (_full, name: string) => {
        return `(Array.isArray(${name}) ? ${name} : ${name} == null ? [] : [${name}]).map(`;
    });
    if (next === content) return { content, changes: [] };
    return { content: next, changes: ["Panel: *.map en lista/ DTO (array-safe)"] };
}

function normalizeVariants(content: string, ctx: NormalizerContext): NormalizationResult {
    const changes: string[] = [];
    if (!ctx.variantsOwner || !ctx.variantsOwner.variants) return { content, changes };

    const valid = new Set(ctx.variantsOwner.variants);
    const fallback = ctx.variantFallback;
    const tagName = ctx.variantsOwner.name;

    const tagRegex = new RegExp(
        `<${tagName}([^>]*?)variant=(?:["']([^"']+)["']|\\{["']([^"']+)["']\\})([^>]*?)>`,
        "g"
    );

    let next = content.replace(tagRegex, (full, pre, strVariant, braceVariant, post) => {
        const v = strVariant ?? braceVariant;
        if (valid.has(v)) return full;
        const replacement = fallback[v] ?? (ctx.variantsOwner!.variants![0] || "default");
        changes.push(`${tagName} variant="${v}" → "${replacement}".`);
        return `<${tagName}${pre}variant="${replacement}"${post}>`;
    });

    // Segundo paso: `variant={ cond ? "success" : "destructive" }` (ternario u
    // otra expresión); el regex de arriba solo cubre variant={'literal'} de una cadena.
    const exprRe = new RegExp(`<${tagName}([^>]*?)variant=\\{([^}]+)\\}([^>]*?)>`, "g");
    next = next.replace(exprRe, (full, pre, inner, post) => {
        let inner2 = inner;
        let touched = false;
        for (const inv of ["success", "info", "warning", "error", "danger", "primary"] as const) {
            if (valid.has(inv) || !inner.includes(`"${inv}"`)) continue;
            const rep = fallback[inv];
            if (!rep) continue;
            inner2 = inner2.replace(new RegExp(`"${inv}"`, "g"), `"${rep}"`);
            touched = true;
        }
        if (touched) {
            changes.push(`${tagName} variant en expresión: literales inválidos → equivalentes del proyecto.`);
        }
        return touched ? `<${tagName}${pre}variant={${inner2}}${post}>` : full;
    });

    return { content: next, changes };
}

function ensureComponentImportIfUsed(content: string, ctx: NormalizerContext): NormalizationResult {
    const changes: string[] = [];
    let next = content;

    for (const comp of ctx.components) {
        const jsxTagRegex = new RegExp(`<${comp.name}\\b`);
        if (!jsxTagRegex.test(next)) continue;

        const importRegex = new RegExp(
            `import\\s+(?:${comp.name}|\\{[^}]*\\b${comp.name}\\b[^}]*\\})\\s+from\\s+["']${comp.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`
        );
        if (importRegex.test(next)) continue;

        // Evitamos inyectar si ya hay algún identificador con ese nombre en el scope
        // (p.ej. el usuario definió un local `const Badge = ...`).
        const localDeclRegex = new RegExp(`(?:const|let|var|function|class)\\s+${comp.name}\\b`);
        if (localDeclRegex.test(next)) continue;

        const importStatement = comp.hasDefault
            ? `import ${comp.name} from "${comp.path}";`
            : comp.namedExports.length > 0
                ? `import { ${comp.namedExports.find(n => n === comp.name) ?? comp.namedExports[0]} } from "${comp.path}";`
                : null;
        if (!importStatement) continue;

        const importBlockMatch = next.match(/^((?:"use client";?\s*\n+)?(?:import[^\n]*\n)*)/);
        const importsBlock = importBlockMatch ? importBlockMatch[0] : "";
        const rest = next.slice(importsBlock.length);
        next = `${importsBlock}${importStatement}\n${rest}`;
        changes.push(`Inyectado import ${comp.name} (uso detectado sin import).`);
    }

    return { content: next, changes };
}

function ensurePanelDefaultExport(content: string, filename: string): NormalizationResult {
    const changes: string[] = [];
    if (!/Panel\.tsx$/.test(filename)) return { content, changes };

    if (/\bexport\s+default\b/.test(content)) return { content, changes };

    const namedArrowMatch = content.match(/export\s+const\s+([A-Za-z_][\w]*)\s*[:=]/);
    const namedFnMatch = content.match(/export\s+function\s+([A-Za-z_][\w]*)\s*\(/);
    const name = namedArrowMatch?.[1] || namedFnMatch?.[1];
    if (!name) return { content, changes };

    changes.push(`Panel '${name}' re-exportado como default (evita desalineación con page.tsx).`);
    return { content: `${content.trimEnd()}\n\nexport default ${name};\n`, changes };
}

export interface NormalizeOptions {
    projectRoot?: string;
    components?: UiComponent[]; // inyectable para tests
}

export function normalizeFrontendOutput(
    files: FileOutput[],
    options: NormalizeOptions = {}
): { files: FileOutput[]; changes: string[] } {
    const projectRoot = options.projectRoot ?? process.cwd();
    const components = options.components ?? introspectUiComponents(projectRoot);
    if (components.length === 0) {
        // Sin componentes UI introspectables (proyecto sin UI o layout distinto):
        // normalizer se reduce a garantizar default export en Panels.
        const ctx = buildContext([]);
        const updated = files.map(file => {
            if (!/Panel\.tsx$/.test(file.path)) return file;
            const result = ensurePanelDefaultExport(file.content, file.path);
            return result.changes.length > 0 ? { ...file, content: result.content } : file;
        });
        return { files: updated, changes: [] };
    }

    const ctx = buildContext(components);
    const allChanges: string[] = [];

    const updated = files.map(file => {
        if (!/\.(tsx|ts)$/.test(file.path)) return file;
        if (!file.path.includes("/features/")) return file;

        let content = file.content;

        const libNamed = normalizeProjectNamedLibImports(content);
        content = libNamed.content;
        allChanges.push(...libNamed.changes.map(c => `[${file.path}] ${c}`));

        const useQueryV5 = normalizeUseQueryLegacyToV5(content, file.path);
        content = useQueryV5.content;
        allChanges.push(...useQueryV5.changes.map(c => `[${file.path}] ${c}`));

        const panelMap = normalizePanelDataMap(content, file.path);
        content = panelMap.content;
        allChanges.push(...panelMap.changes.map(c => `[${file.path}] ${c}`));

        const imports = normalizeImports(content, ctx);
        content = imports.content;
        allChanges.push(...imports.changes.map(c => `[${file.path}] ${c}`));

        const variants = normalizeVariants(content, ctx);
        content = variants.content;
        allChanges.push(...variants.changes.map(c => `[${file.path}] ${c}`));

        const badgeImport = ensureComponentImportIfUsed(content, ctx);
        content = badgeImport.content;
        allChanges.push(...badgeImport.changes.map(c => `[${file.path}] ${c}`));

        const panelExport = ensurePanelDefaultExport(content, file.path);
        content = panelExport.content;
        allChanges.push(...panelExport.changes.map(c => `[${file.path}] ${c}`));

        return content === file.content ? file : { ...file, content };
    });

    return { files: updated, changes: allChanges };
}
