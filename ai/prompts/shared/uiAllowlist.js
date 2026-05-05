"use strict";
/**
 * Construye la sección "ALIASES DEL PROYECTO" del prompt frontend leyendo
 * los componentes UI reales del disco. Mantiene el prompt sincronizado con
 * el código sin requerir edición manual cuando se añade un componente.
 *
 * Fallback: si la introspección falla (proyecto sin UI o path distinto),
 * devuelve un bloque estático mínimo para no romper el prompt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNpmAllowlistBlock = exports.NPM_BLOCKLIST = exports.NPM_ALLOWLIST = exports.buildUiAllowlistBlock = void 0;
const uiComponentIntrospector_1 = require("../../orchestrator/generation/uiComponentIntrospector");
function buildUiAllowlistBlock(options = {}) {
    const projectRoot = options.projectRoot ?? process.cwd();
    const components = (0, uiComponentIntrospector_1.introspectUiComponents)(projectRoot);
    if (components.length === 0) {
        return [
            "ALIASES DEL PROYECTO (no se pudo introspeccionar; lista mínima):",
            "- \"@/lib/api-client\"        (exports: apiClient)",
            "- \"@/services/auth.service\" (exports: getApiAccessToken)"
        ].join("\n");
    }
    const lines = [];
    lines.push("ALIASES DEL PROYECTO (casing EXACTO obligatorio; derivado del código real):");
    lines.push("- \"@/lib/api-client\"        (exports: apiClient)");
    lines.push("- \"@/services/auth.service\" (exports: getApiAccessToken)");
    for (const comp of components.sort((a, b) => a.name.localeCompare(b.name))) {
        const details = [];
        if (comp.hasDefault)
            details.push(`default: ${comp.name}`);
        if (comp.namedExports.length > 0)
            details.push(`named: ${comp.namedExports.join(", ")}`);
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
exports.buildUiAllowlistBlock = buildUiAllowlistBlock;
/**
 * Lista estática de paquetes NPM permitidos / prohibidos. Se mantiene
 * aparte porque no depende del disco.
 */
exports.NPM_ALLOWLIST = [
    "@tanstack/react-query",
    "axios (solo vía apiClient, nunca directo)",
    "clsx / tailwind-merge",
    "class-variance-authority",
    "lucide-react (única librería de iconos permitida)",
    "react / react-dom / next"
];
exports.NPM_BLOCKLIST = [
    "date-fns → usa Intl.DateTimeFormat nativo",
    "date-fns/locale → no existe, usa Intl",
    "react-icons → usa lucide-react",
    "dayjs / moment → usa Intl nativo"
];
function buildNpmAllowlistBlock() {
    const lines = [];
    lines.push("PAQUETES NPM PERMITIDOS:");
    exports.NPM_ALLOWLIST.forEach(p => lines.push(`- ${p}`));
    lines.push("");
    lines.push("PAQUETES PROHIBIDOS (no instalados):");
    exports.NPM_BLOCKLIST.forEach(p => lines.push(`- ${p}`));
    return lines.join("\n");
}
exports.buildNpmAllowlistBlock = buildNpmAllowlistBlock;
