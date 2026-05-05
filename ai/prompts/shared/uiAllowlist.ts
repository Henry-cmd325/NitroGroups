/**
 * Construye la sección "ALIASES DEL PROYECTO" del prompt frontend leyendo
 * los componentes UI reales del disco. Mantiene el prompt sincronizado con
 * el código sin requerir edición manual cuando se añade un componente.
 *
 * Fallback: si la introspección falla (proyecto sin UI o path distinto),
 * devuelve un bloque estático mínimo para no romper el prompt.
 */

import { introspectUiComponents } from "../../orchestrator/generation/uiComponentIntrospector";

interface AllowlistOptions {
    projectRoot?: string;
}

export function buildUiAllowlistBlock(options: AllowlistOptions = {}): string {
    const projectRoot = options.projectRoot ?? process.cwd();
    const components = introspectUiComponents(projectRoot);

    if (components.length === 0) {
        return [
            "ALIASES DEL PROYECTO (no se pudo introspeccionar; lista mínima):",
            "- \"@/lib/api-client\"        (exports: apiClient)",
            "- \"@/services/auth.service\" (exports: getApiAccessToken)"
        ].join("\n");
    }

    const lines: string[] = [];
    lines.push("ALIASES DEL PROYECTO (casing EXACTO obligatorio; derivado del código real):");
    lines.push("- \"@/lib/api-client\"        (exports: apiClient)");
    lines.push("- \"@/services/auth.service\" (exports: getApiAccessToken)");

    for (const comp of components.sort((a, b) => a.name.localeCompare(b.name))) {
        const details: string[] = [];
        if (comp.hasDefault) details.push(`default: ${comp.name}`);
        if (comp.namedExports.length > 0) details.push(`named: ${comp.namedExports.join(", ")}`);
        if (comp.variants && comp.variants.length > 0) {
            details.push(`variants válidas: ${comp.variants.join(" | ")}`);
        }
        const detailSuffix = details.length > 0 ? `  (${details.join("; ")})` : "";
        lines.push(`- "${comp.path}"${detailSuffix}`);
    }

    lines.push("");
    lines.push("⚠️  USA EL CASING EXACTO del nombre de archivo. Card, Button, Alert son con mayúscula.");
    lines.push("⚠️  NO INVENTES named exports (ej. CardHeader/CardContent NO existen si Card es default).");
    lines.push("⚠️  NO uses Badge variants distintas a las listadas arriba.");

    return lines.join("\n");
}

/**
 * Lista estática de paquetes NPM permitidos / prohibidos. Se mantiene
 * aparte porque no depende del disco.
 */
export const NPM_ALLOWLIST = [
    "@tanstack/react-query",
    "axios (solo vía apiClient, nunca directo)",
    "clsx / tailwind-merge",
    "class-variance-authority",
    "lucide-react (única librería de iconos permitida)",
    "react / react-dom / next"
];

export const NPM_BLOCKLIST = [
    "date-fns → usa Intl.DateTimeFormat nativo",
    "date-fns/locale → no existe, usa Intl",
    "react-icons → usa lucide-react",
    "dayjs / moment → usa Intl nativo"
];

export function buildNpmAllowlistBlock(): string {
    const lines: string[] = [];
    lines.push("PAQUETES NPM PERMITIDOS:");
    NPM_ALLOWLIST.forEach(p => lines.push(`- ${p}`));
    lines.push("");
    lines.push("PAQUETES PROHIBIDOS (no instalados):");
    NPM_BLOCKLIST.forEach(p => lines.push(`- ${p}`));
    return lines.join("\n");
}
