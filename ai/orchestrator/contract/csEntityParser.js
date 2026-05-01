"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findEntityFile = exports.parseEntityWithAncestors = exports.resolveAncestorProperties = exports.parseCsEntityFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PROPERTY_REGEX = /^\s*public\s+(?:virtual\s+|override\s+)?([A-Za-z_][A-Za-z0-9_<>?]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*(?:get;\s*)(?:(?:private\s+|protected\s+)?set;\s*)?\}(?:\s*=\s*[^;]+;)?\s*$/;
const CLASS_REGEX = /^\s*public\s+(?:sealed\s+|abstract\s+|partial\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([^{]+))?\s*\{?/;
const NAMESPACE_REGEX = /^\s*namespace\s+([A-Za-z0-9_.]+)\s*(?:;|\{)/;
const ENUM_REGEX = /^\s*public\s+enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{?/;
function parseCsEntityFile(filePath, source = "entity") {
    const content = fs_1.default.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    const result = {
        fileName: path_1.default.basename(filePath),
        entityName: "",
        baseTypes: [],
        properties: [],
        enums: []
    };
    let currentClassDepth = 0;
    let inEnum = null;
    for (const line of lines) {
        const ns = line.match(NAMESPACE_REGEX);
        if (ns && !result.namespace)
            result.namespace = ns[1];
        const enumMatch = line.match(ENUM_REGEX);
        if (enumMatch) {
            inEnum = { name: enumMatch[1], values: [] };
            continue;
        }
        if (inEnum) {
            if (/^\s*\}\s*$/.test(line)) {
                if (inEnum.values.length > 0)
                    result.enums.push(inEnum);
                inEnum = null;
                continue;
            }
            const valueMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*\d+)?\s*,?\s*(?:\/\/.*)?$/);
            if (valueMatch && valueMatch[1] !== "public") {
                inEnum.values.push(valueMatch[1]);
            }
            continue;
        }
        const cls = line.match(CLASS_REGEX);
        if (cls && !result.entityName) {
            result.entityName = cls[1];
            if (cls[2]) {
                result.baseTypes = cls[2].split(",").map(s => s.trim()).filter(Boolean);
            }
            currentClassDepth++;
            continue;
        }
        const prop = line.match(PROPERTY_REGEX);
        if (prop) {
            const rawType = prop[1];
            const name = prop[2];
            const nullable = rawType.endsWith("?");
            const csType = nullable ? rawType.slice(0, -1) : rawType;
            result.properties.push({ name, csType, nullable, source });
        }
    }
    return result;
}
exports.parseCsEntityFile = parseCsEntityFile;
/**
 * Resuelve propiedades de ancestros conocidos (AuditableModel, DomainModel) leyendo
 * desde `Shared/NitroGroups.Shared.Domain/`. No busca recursivamente todos los
 * ancestros del ecosistema — solo los dos que uso el proyecto hoy.
 */
function resolveAncestorProperties(baseTypes, projectRoot) {
    const sharedDir = path_1.default.join(projectRoot, "Shared", "NitroGroups.Shared.Domain");
    if (!fs_1.default.existsSync(sharedDir))
        return [];
    const resolved = [];
    const visited = new Set();
    const queue = [...baseTypes];
    while (queue.length > 0) {
        const typeName = queue.shift();
        if (visited.has(typeName))
            continue;
        visited.add(typeName);
        if (/^I[A-Z]/.test(typeName))
            continue; // interfaces ignoradas
        const candidate = path_1.default.join(sharedDir, `${typeName}.cs`);
        if (!fs_1.default.existsSync(candidate))
            continue;
        const ancestor = parseCsEntityFile(candidate, "ancestor");
        resolved.push(...ancestor.properties);
        ancestor.baseTypes.forEach(t => queue.push(t));
    }
    return resolved;
}
exports.resolveAncestorProperties = resolveAncestorProperties;
function parseEntityWithAncestors(filePath, projectRoot) {
    const primary = parseCsEntityFile(filePath, "entity");
    const ancestors = resolveAncestorProperties(primary.baseTypes, projectRoot);
    const merged = [...primary.properties];
    const seen = new Set(merged.map(p => p.name));
    for (const anc of ancestors) {
        if (!seen.has(anc.name)) {
            merged.push(anc);
            seen.add(anc.name);
        }
    }
    return { ...primary, properties: merged };
}
exports.parseEntityWithAncestors = parseEntityWithAncestors;
/**
 * Localiza el .cs de una entidad dentro de un módulo (o del proyecto entero).
 */
function findEntityFile(entityName, projectRoot, preferredModule) {
    const roots = [];
    if (preferredModule) {
        roots.push(path_1.default.join(projectRoot, "Core", preferredModule, `NitroGroups.Core.${preferredModule}.Domain`, "Entities"));
    }
    const coreDir = path_1.default.join(projectRoot, "Core");
    if (fs_1.default.existsSync(coreDir)) {
        for (const module of fs_1.default.readdirSync(coreDir)) {
            roots.push(path_1.default.join(coreDir, module, `NitroGroups.Core.${module}.Domain`, "Entities"));
        }
    }
    for (const root of roots) {
        const candidate = path_1.default.join(root, `${entityName}.cs`);
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    return null;
}
exports.findEntityFile = findEntityFile;
