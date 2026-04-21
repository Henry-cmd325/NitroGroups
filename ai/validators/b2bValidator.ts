const TYPE_MAPPINGS: Record<string, string[]> = {
    "number": ["int", "long", "float", "double", "decimal", "int?", "long?", "decimal?"],
    "decimal": ["decimal", "decimal?"],
    "string": ["string", "Guid", "DateTime", "string?", "Guid?", "DateTime?"]
};

const FORMAT_TO_CSHARP: Record<string, string[]> = {
    "decimal": ["decimal", "decimal?"],
    "long": ["long", "long?", "int", "int?"],
    "int": ["int", "int?"],
    "uuid": ["Guid", "Guid?"],
    "iso-date": ["DateTime", "DateTime?", "DateTimeOffset", "DateTimeOffset?"],
    "iso-currency": ["string", "string?"]
};

export function validateB2BCoherence(contract: any, frontendCode: string, backendCode: string): { isValid: boolean, error?: string } {
    const endpoint = contract.endpoint;

    // 1. Validación de Ruta
    if (!frontendCode.includes(endpoint) && !frontendCode.includes(endpoint.replace("/api", ""))) {
        return { isValid: false, error: `B2B_ROUTE_MISMATCH: El frontend no referencia el endpoint '${endpoint}'` };
    }

    // 2. Validación de Campos y Tipos
    for (const method of contract.methods) {
        const reqErr = checkFieldsInCode(method.request?.fields, backendCode, 'C#');
        if (reqErr) return { isValid: false, error: reqErr };

        const resErr = checkFieldsInCode(method.response?.fields, backendCode, 'C#');
        if (resErr) return { isValid: false, error: resErr };

        const feReqErr = checkFieldsInCode(method.request?.fields, frontendCode, 'TS');
        if (feReqErr) return { isValid: false, error: feReqErr };

        const feResErr = checkFieldsInCode(method.response?.fields, frontendCode, 'TS');
        if (feResErr) return { isValid: false, error: feResErr };
    }

    return { isValid: true };
}

function checkFieldsInCode(fields: any, code: string, lang: 'C#' | 'TS'): string | null {
    if (!fields) return null;
    const codeLower = code.toLowerCase();

    for (const [key, meta] of Object.entries(fields) as [string, any][]) {
        // Verificar que el campo existe en el código
        if (!codeLower.includes(key.toLowerCase())) {
            return `B2B_FIELD_MISSING: Campo '${key}' no encontrado en código ${lang}`;
        }

        // Para C#, verificar tipos de precisión cuando hay format
        if (lang === "C#" && meta.format) {
            const allowedTypes = FORMAT_TO_CSHARP[meta.format];
            if (allowedTypes) {
                const hasType = allowedTypes.some(t => code.includes(t));
                if (!hasType) {
                    return `B2B_TYPE_MISMATCH: Campo '${key}' (format: ${meta.format}) requiere uno de [${allowedTypes.join(', ')}] en C#`;
                }
            }
        }
    }
    return null;
}

/**
 * Valida la compatibilidad entre el contrato B2B y la entidad de dominio real.
 * Si un campo del contrato tiene un format estricto (decimal, uuid),
 * la entidad DEBE tener un tipo compatible.
 */
export function validateContractVsEntity(contract: any, entityContext: string): { isValid: boolean, warnings: string[], errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const entityLower = entityContext.toLowerCase();

    for (const method of contract.methods) {
        const allFields = {
            ...(method.request?.fields || {}),
            ...(method.response?.fields || {})
        };

        for (const [key, meta] of Object.entries(allFields) as [string, any][]) {
            // Verificar existencia del campo (warning, no bloqueo)
            if (!entityLower.includes(key.toLowerCase())) {
                warnings.push(`Campo '${key}' del contrato no tiene contraparte clara en la Entidad (podría ser un campo derivado o de otro aggregate).`);
            }

            // Verificar tipos de precisión (BLOQUEO si hay incompatibilidad crítica)
            if (meta.format === "decimal") {
                if (entityContext.includes("int " + key) || entityContext.includes("int " + key.charAt(0).toUpperCase() + key.slice(1))) {
                    errors.push(`TIPO INCOMPATIBLE: Contrato dice '${key}: decimal' pero la Entidad usa 'int'. Pérdida de precisión financiera.`);
                }
            }

            if (meta.format === "uuid") {
                // Si la entidad usa int para un campo que debería ser Guid
                const capitalKey = key.charAt(0).toUpperCase() + key.slice(1);
                if (entityContext.includes(`int ${capitalKey}`) && !entityContext.includes(`Guid ${capitalKey}`)) {
                    errors.push(`TIPO INCOMPATIBLE: Contrato dice '${key}: uuid' pero la Entidad usa 'int'. Debe ser 'Guid'.`);
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        warnings,
        errors
    };
}
