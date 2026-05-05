import type { B2BContract } from "../types";

/**
 * Convierte nombres estilo "listGroupMediaRequest" a identificador C# PascalCase
 * (ListGroupMediaRequest). No toca cadenas que ya empiezan en mayúscula sin
 * camelCase en el resto, salvo mejora conservadora.
 */
export function toCSharpDtoClassName(name: string): string {
    if (!name || !name.trim()) return name;
    const s = name.trim();
    if (/^[a-z]/.test(s)) {
        const spaced = s
            .replace(/[-_]([a-zA-Z0-9])/g, (_m, c: string) => " " + c)
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
        return spaced
            .split(/\s+/)
            .filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join("");
    }
    return s;
}

/**
 * Ajusta in-place nombres de DTOs del contrato para alinear búsquedas estructurales
 * y el fallback determinista (clases C# = PascalCase).
 */
export function normalizeB2BContractDtoNamesInPlace(contract: B2BContract): void {
    for (const m of contract.methods || []) {
        if (m.request?.name) {
            m.request.name = toCSharpDtoClassName(m.request.name);
        }
        if (m.response?.name) {
            m.response.name = toCSharpDtoClassName(m.response.name);
        }
    }
}
