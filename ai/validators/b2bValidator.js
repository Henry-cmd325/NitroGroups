"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContractVsEntity = exports.validateContractIntegrity = exports.validateB2BCoherence = void 0;
/**
 * Alinea tokens de `scope.allowedEndpoints` (p. ej. `list-availability`) con
 * nombres de método camelCase (`listAvailability`) y con verbos HTTP.
 */
function normalizeScopeKey(s) {
    return s.trim().toLowerCase().replace(/-/g, "");
}
function methodMatchesScopeAllowlist(allowed, method) {
    const a = allowed.trim().toLowerCase();
    if (!a)
        return false;
    const httpToken = `${method.http || ""}`.toLowerCase();
    const methodToken = `${method.name || ""}`.toLowerCase();
    if (a === httpToken)
        return true;
    if (methodToken.includes(a))
        return true;
    const an = normalizeScopeKey(allowed);
    const mn = normalizeScopeKey(method.name || "");
    if (an.length === 0 || mn.length === 0)
        return false;
    if (mn === an)
        return true;
    if (mn.includes(an) || an.includes(mn))
        return true;
    return false;
}
const TYPE_MAPPINGS = {
    "number": ["int", "long", "float", "double", "decimal", "int?", "long?", "decimal?"],
    "decimal": ["decimal", "decimal?"],
    "string": ["string", "Guid", "DateTime", "string?", "Guid?", "DateTime?"]
};
const FORMAT_TO_CSHARP = {
    "decimal": ["decimal", "decimal?"],
    "long": ["long", "long?", "int", "int?"],
    "int": ["int", "int?", "long", "long?"],
    "uuid": ["Guid", "Guid?"],
    "iso-date": ["DateTime", "DateTime?", "DateTimeOffset", "DateTimeOffset?"],
    "iso-currency": ["string", "string?"]
};
function validateB2BCoherence(contract, frontendCode, backendCode) {
    const endpoint = contract.endpoint;
    // 1. Validación de Ruta
    if (!frontendCode.includes(endpoint) && !frontendCode.includes(endpoint.replace("/api", ""))) {
        return { isValid: false, error: `B2B_ROUTE_MISMATCH: El frontend no referencia el endpoint '${endpoint}'` };
    }
    // 2. Validación de Campos y Tipos
    for (const method of contract.methods) {
        const reqErr = checkFieldsInCode(method.request?.fields, backendCode, 'C#');
        if (reqErr)
            return { isValid: false, error: reqErr };
        const resErr = checkFieldsInCode(method.response?.fields, backendCode, 'C#');
        if (resErr)
            return { isValid: false, error: resErr };
        const feReqErr = checkFieldsInCode(method.request?.fields, frontendCode, 'TS');
        if (feReqErr)
            return { isValid: false, error: feReqErr };
        const feResErr = checkFieldsInCode(method.response?.fields, frontendCode, 'TS');
        if (feResErr)
            return { isValid: false, error: feResErr };
    }
    return { isValid: true };
}
exports.validateB2BCoherence = validateB2BCoherence;
function validateContractIntegrity(contract) {
    const errors = [];
    const warnings = [];
    if (!contract || typeof contract !== "object") {
        return { isValid: false, errors: ["Contrato inválido: JSON no parseable o no es un objeto."], warnings };
    }
    if (!contract.feature || typeof contract.feature !== "string") {
        errors.push("El contrato debe incluir 'feature' (string).");
    }
    if (!contract.endpoint || typeof contract.endpoint !== "string" || !contract.endpoint.startsWith("/api/")) {
        errors.push("El contrato debe incluir 'endpoint' válido y debe iniciar con '/api/'.");
    }
    if (!Array.isArray(contract.methods) || contract.methods.length === 0) {
        errors.push("El contrato debe incluir al menos un método en 'methods'.");
    }
    const allowedEndpoints = Array.isArray(contract.scope?.allowedEndpoints)
        ? contract.scope.allowedEndpoints
            .map((value) => String(value).trim().toLowerCase())
            .filter(Boolean)
        : [];
    if (allowedEndpoints.length === 0) {
        warnings.push("No se definieron 'scope.allowedEndpoints'. Se usará el endpoint del contrato como referencia mínima.");
    }
    for (const method of contract.methods || []) {
        if (!method?.name || typeof method.name !== "string") {
            errors.push("Cada método debe incluir 'name' (string).");
            continue;
        }
        if (!method.http || typeof method.http !== "string") {
            errors.push(`El método '${method.name}' no define 'http'.`);
            continue;
        }
        const matchesScope = allowedEndpoints.length === 0
            ? true
            : allowedEndpoints.some(allowed => methodMatchesScopeAllowlist(allowed, method));
        if (!matchesScope) {
            errors.push(`El método '${method.name}' (${method.http}) no está permitido por 'scope.allowedEndpoints'.`);
        }
        // El request sólo es obligatorio para verbos con body (POST/PUT/PATCH)
        // o para GET con parámetros. En `list` (GET sin params) y `delete-all`
        // es legítimo omitirlo.
        const httpUpper = String(method.http).toUpperCase();
        const requestObligatorio = httpUpper === "POST" || httpUpper === "PUT" || httpUpper === "PATCH";
        if (requestObligatorio && !method.request?.name) {
            warnings.push(`El método '${method.name}' (${httpUpper}) suele llevar request DTO y no se definió.`);
        }
        if (!method.response?.name) {
            warnings.push(`El método '${method.name}' no define name en response DTO.`);
        }
    }
    for (const allowed of allowedEndpoints) {
        const hasImplementation = (contract.methods || []).some((method) => methodMatchesScopeAllowlist(allowed, method));
        if (!hasImplementation) {
            errors.push(`'scope.allowedEndpoints' declara '${allowed}' pero no existe método compatible en 'methods'.`);
        }
    }
    return { isValid: errors.length === 0, errors, warnings };
}
exports.validateContractIntegrity = validateContractIntegrity;
function checkFieldsInCode(fields, code, lang) {
    if (!fields)
        return null;
    const codeLower = code.toLowerCase();
    for (const [key, meta] of Object.entries(fields)) {
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
function validateContractVsEntity(contract, entityContext) {
    const warnings = [];
    const errors = [];
    const entityLower = entityContext.toLowerCase();
    for (const method of contract.methods) {
        const allFields = {
            ...(method.request?.fields || {}),
            ...(method.response?.fields || {})
        };
        for (const [key, meta] of Object.entries(allFields)) {
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
exports.validateContractVsEntity = validateContractVsEntity;
