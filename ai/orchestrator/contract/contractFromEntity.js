"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeContractFile = exports.generateContractFromEntity = void 0;
const path_1 = __importDefault(require("path"));
const csEntityParser_1 = require("./csEntityParser");
const contextExtractor_1 = require("../../utils/contextExtractor");
const AUDIT_FIELDS = new Set([
    "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt", "DeletedBy", "DeletedAt",
    "DomainEvents"
]);
const DEFAULT_EXCLUDE = new Set([
    "DomainEvents"
]);
function toCamel(value) {
    if (!value)
        return value;
    return value.charAt(0).toLowerCase() + value.slice(1);
}
function mapCsTypeToContractField(prop, enumsByName) {
    const t = prop.csType;
    switch (t) {
        case "long": return { type: "number", format: "long" };
        case "int": return { type: "number", format: "int" };
        case "short": return { type: "number", format: "int" };
        case "decimal": return { type: "number", format: "decimal" };
        case "double": return { type: "number", format: "decimal" };
        case "float": return { type: "number", format: "decimal" };
        case "bool": return { type: "boolean" };
        case "Guid": return { type: "string", format: "uuid" };
        case "DateTime":
        case "DateTimeOffset":
            return { type: "string", format: "iso-date" };
        case "string": return { type: "string" };
    }
    if (enumsByName.has(t)) {
        // Enums se serializan como string (por convención del proyecto vía JsonStringEnumConverter).
        return { type: "string", format: `enum:${t}` };
    }
    return null;
}
/**
 * Calcula el entityHash usando el mismo algoritmo que `generateFeature` aplica
 * al detectar drift (`calculateSemanticHash` sobre `extractDomainContext(feature)`).
 *
 * Esto es CRÍTICO: si usamos un hash distinto, el pipeline reportará drift
 * en el primer `generate-feature` aunque nada haya cambiado. El precio es
 * que el hash cubre todo el módulo de entidades (no solo la entidad base),
 * pero eso es aceptable porque un cambio en cualquier entidad del módulo
 * puede romper supuestos del contrato.
 *
 * Fallback: si `extractDomainContext` no encuentra el módulo (p.ej. ejecuciones
 * desde tests fuera de un repo real), usamos "INITIAL_SIGNATURE" para que el
 * drift check no falle y queda el usuario autorizado a correr --update-hash.
 */
function computeEntityHash(feature) {
    const ctx = (0, contextExtractor_1.extractDomainContext)(feature);
    if (!ctx)
        return "INITIAL_SIGNATURE";
    return (0, contextExtractor_1.calculateSemanticHash)(ctx);
}
function toFeatureName(entityName, override) {
    if (override)
        return override;
    return toCamel(entityName);
}
function pluralize(singular) {
    const lower = singular.toLowerCase();
    if (/(y)$/i.test(singular) && !/[aeiou]y$/i.test(singular)) {
        return singular.slice(0, -1) + "ies";
    }
    if (/(s|x|ch|sh|z)$/i.test(lower))
        return singular + "es";
    return singular + "s";
}
function endpointBase(feature) {
    return `/api/${pluralize(feature).toLowerCase()}`;
}
function generateContractFromEntity(entityName, options) {
    const entityFile = (0, csEntityParser_1.findEntityFile)(entityName, options.projectRoot, options.module);
    if (!entityFile) {
        throw new Error(`No se encontró el archivo de entidad para '${entityName}'.`);
    }
    const entity = (0, csEntityParser_1.parseEntityWithAncestors)(entityFile, options.projectRoot);
    if (!entity.entityName) {
        throw new Error(`No se pudo parsear el nombre de clase de ${entityFile}.`);
    }
    const enumsByName = new Map();
    entity.enums.forEach(e => enumsByName.set(e.name, e.values));
    const excluded = new Set(DEFAULT_EXCLUDE);
    if (options.excludeAudit) {
        AUDIT_FIELDS.forEach(f => excluded.add(f));
    }
    const includable = entity.properties.filter(p => !excluded.has(p.name));
    const notes = [];
    const responseFields = {};
    for (const prop of includable) {
        const field = mapCsTypeToContractField(prop, enumsByName);
        if (!field) {
            notes.push(`Propiedad '${prop.name}: ${prop.csType}' no mapeada al contrato (tipo desconocido).`);
            continue;
        }
        responseFields[toCamel(prop.name)] = field;
    }
    const feature = toFeatureName(entity.entityName, options.feature);
    const featurePascal = entity.entityName;
    const responseName = `${featurePascal}Response`;
    const methods = [];
    const endpoint = endpointBase(feature);
    switch (options.operation) {
        case "list": {
            methods.push({
                name: `list${featurePascal}`,
                http: "GET",
                response: { name: responseName, fields: responseFields }
            });
            notes.push("Operación 'list': sin parámetros de request. Response representa UN elemento; en runtime devuelves una lista serializada.");
            break;
        }
        case "get-by-id": {
            methods.push({
                name: `get${featurePascal}`,
                http: "GET",
                request: {
                    name: `Get${featurePascal}Request`,
                    fields: { id: { type: "number", format: "long" } }
                },
                response: { name: responseName, fields: responseFields }
            });
            break;
        }
        case "create": {
            const requestFields = { ...responseFields };
            delete requestFields["id"];
            methods.push({
                name: `create${featurePascal}`,
                http: "POST",
                request: { name: `Create${featurePascal}Request`, fields: requestFields },
                response: { name: responseName, fields: responseFields }
            });
            break;
        }
        case "update": {
            const requestFields = { ...responseFields };
            methods.push({
                name: `update${featurePascal}`,
                http: "PUT",
                request: { name: `Update${featurePascal}Request`, fields: requestFields },
                response: { name: responseName, fields: responseFields }
            });
            break;
        }
        case "delete": {
            methods.push({
                name: `delete${featurePascal}`,
                http: "DELETE",
                request: {
                    name: `Delete${featurePascal}Request`,
                    fields: { id: { type: "number", format: "long" } }
                },
                response: { name: `${featurePascal}DeleteResponse`, fields: { success: { type: "boolean" } } }
            });
            break;
        }
    }
    const allowedEndpoints = [{
            "GET": "get", "POST": "create", "PUT": "update", "PATCH": "update", "DELETE": "delete"
        }[methods[0].http] || "get"];
    const contract = {
        v: "1.0.0",
        feature,
        endpoint,
        scope: { allowedEndpoints, allowInternalLogic: true },
        businessRules: {
            precision: "decimal",
            notes: `Generado desde la entidad '${entity.entityName}' (${entity.namespace || "?"}) vía generate-contract.`
        },
        entityHash: computeEntityHash(feature),
        methods,
        auth: true
    };
    return { contract, entity, notes };
}
exports.generateContractFromEntity = generateContractFromEntity;
function writeContractFile(contract, projectRoot, overwrite = false) {
    const dir = path_1.default.join(projectRoot, "ai", "contracts", "b2b");
    const fileName = `${contract.feature}.contract.json`;
    const fullPath = path_1.default.join(dir, fileName);
    const fs = require("fs");
    fs.mkdirSync(dir, { recursive: true });
    const existed = fs.existsSync(fullPath);
    if (existed && !overwrite) {
        throw new Error(`Contrato ya existe en ${fullPath}. Usa --force para sobrescribir.`);
    }
    fs.writeFileSync(fullPath, JSON.stringify(contract, null, 2));
    return { path: fullPath, existed };
}
exports.writeContractFile = writeContractFile;
