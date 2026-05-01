"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeB2BContractDtoNamesInPlace = exports.toCSharpDtoClassName = void 0;
/**
 * Convierte nombres estilo "listGroupMediaRequest" a identificador C# PascalCase
 * (ListGroupMediaRequest). No toca cadenas que ya empiezan en mayúscula sin
 * camelCase en el resto, salvo mejora conservadora.
 */
function toCSharpDtoClassName(name) {
    if (!name || !name.trim())
        return name;
    const s = name.trim();
    if (/^[a-z]/.test(s)) {
        const spaced = s
            .replace(/[-_]([a-zA-Z0-9])/g, (_m, c) => " " + c)
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
        return spaced
            .split(/\s+/)
            .filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join("");
    }
    return s;
}
exports.toCSharpDtoClassName = toCSharpDtoClassName;
/**
 * Ajusta in-place nombres de DTOs del contrato para alinear búsquedas estructurales
 * y el fallback determinista (clases C# = PascalCase).
 */
function normalizeB2BContractDtoNamesInPlace(contract) {
    for (const m of contract.methods || []) {
        if (m.request?.name) {
            m.request.name = toCSharpDtoClassName(m.request.name);
        }
        if (m.response?.name) {
            m.response.name = toCSharpDtoClassName(m.response.name);
        }
    }
}
exports.normalizeB2BContractDtoNamesInPlace = normalizeB2BContractDtoNamesInPlace;
