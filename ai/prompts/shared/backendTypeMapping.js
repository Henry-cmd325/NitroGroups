"use strict";
/**
 * Tabla de mapeo Contrato JSON → C# usada por el prompt backend.
 *
 * Mantenerla aquí permite:
 *  - Tests unitarios sobre el mapeo (sin depender del prompt completo).
 *  - Reutilizarla desde `contractRepair.ts` / `backendFallback.ts` para
 *    mantener el comportamiento consistente entre LLM y deterministic
 *    fallback. Hoy ambos módulos replican el mismo switch en varios lugares;
 *    el plan v1.2 es centralizar aquí.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupCsharpType = exports.buildBackendTypeMappingTable = exports.BACKEND_TYPE_MAPPINGS = void 0;
exports.BACKEND_TYPE_MAPPINGS = [
    { jsonType: "string", jsonFormat: "iso-date", csharpType: "DateTimeOffset" },
    { jsonType: "string", jsonFormat: "iso-date-time", csharpType: "DateTimeOffset" },
    { jsonType: "string", jsonFormat: "uuid", csharpType: "Guid" },
    { jsonType: "string", jsonFormat: "iso-currency", csharpType: "string" },
    { jsonType: "string", csharpType: "string", note: "sin format" },
    { jsonType: "number", jsonFormat: "long", csharpType: "long" },
    { jsonType: "number", jsonFormat: "int", csharpType: "int" },
    { jsonType: "integer", jsonFormat: "long", csharpType: "long" },
    { jsonType: "integer", csharpType: "int", note: "sin format" },
    { jsonType: "number", jsonFormat: "decimal", csharpType: "decimal" },
    { jsonType: "number", csharpType: "double", note: "sin format" },
    { jsonType: "boolean", csharpType: "bool" }
];
function buildBackendTypeMappingTable() {
    const lines = [];
    lines.push("| Contrato JSON                            | C# tipo OBLIGATORIO |");
    lines.push("|------------------------------------------|---------------------|");
    for (const m of exports.BACKEND_TYPE_MAPPINGS) {
        const typeDesc = m.jsonFormat
            ? `type: "${m.jsonType}", format: "${m.jsonFormat}"`
            : `type: "${m.jsonType}"${m.note ? ` (${m.note})` : ""}`;
        const padded = typeDesc.padEnd(40);
        lines.push(`| ${padded} | ${m.csharpType.padEnd(19)} |`);
    }
    return lines.join("\n");
}
exports.buildBackendTypeMappingTable = buildBackendTypeMappingTable;
function lookupCsharpType(jsonType, jsonFormat) {
    // Primero buscamos match exacto con format, luego match por type solo.
    if (jsonFormat) {
        const exact = exports.BACKEND_TYPE_MAPPINGS.find(m => m.jsonType === jsonType && m.jsonFormat === jsonFormat);
        if (exact)
            return exact.csharpType;
    }
    const base = exports.BACKEND_TYPE_MAPPINGS.find(m => m.jsonType === jsonType && !m.jsonFormat);
    return base?.csharpType ?? null;
}
exports.lookupCsharpType = lookupCsharpType;
