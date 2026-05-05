import fs from "fs";
import path from "path";

export interface CsProperty {
    name: string;          // "StartAt"
    csType: string;        // "DateTimeOffset", "long", "string", "Guid?", "int?"
    nullable: boolean;     // true si termina en "?"
    enumValues?: string[]; // si csType corresponde a un enum definido en el mismo archivo
    source: "entity" | "ancestor";
}

export interface ParsedEntity {
    fileName: string;
    entityName: string;
    namespace?: string;
    baseTypes: string[];
    properties: CsProperty[];
    enums: { name: string; values: string[] }[];
}

const PROPERTY_REGEX = /^\s*public\s+(?:virtual\s+|override\s+)?([A-Za-z_][A-Za-z0-9_<>?]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*(?:get;\s*)(?:(?:private\s+|protected\s+)?set;\s*)?\}(?:\s*=\s*[^;]+;)?\s*$/;
const CLASS_REGEX = /^\s*public\s+(?:sealed\s+|abstract\s+|partial\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*:\s*([^{]+))?\s*\{?/;
const NAMESPACE_REGEX = /^\s*namespace\s+([A-Za-z0-9_.]+)\s*(?:;|\{)/;
const ENUM_REGEX = /^\s*public\s+enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{?/;

export function parseCsEntityFile(filePath: string, source: "entity" | "ancestor" = "entity"): ParsedEntity {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);

    const result: ParsedEntity = {
        fileName: path.basename(filePath),
        entityName: "",
        baseTypes: [],
        properties: [],
        enums: []
    };

    let currentClassDepth = 0;
    let inEnum: { name: string; values: string[] } | null = null;

    for (const line of lines) {
        const ns = line.match(NAMESPACE_REGEX);
        if (ns && !result.namespace) result.namespace = ns[1];

        const enumMatch = line.match(ENUM_REGEX);
        if (enumMatch) {
            inEnum = { name: enumMatch[1], values: [] };
            continue;
        }
        if (inEnum) {
            if (/^\s*\}\s*$/.test(line)) {
                if (inEnum.values.length > 0) result.enums.push(inEnum);
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

/**
 * Resuelve propiedades de ancestros conocidos (AuditableModel, DomainModel) leyendo
 * desde `Shared/NitroGroups.Shared.Domain/`. No busca recursivamente todos los
 * ancestros del ecosistema — solo los dos que uso el proyecto hoy.
 */
export function resolveAncestorProperties(
    baseTypes: string[],
    projectRoot: string
): CsProperty[] {
    const sharedDir = path.join(projectRoot, "Shared", "NitroGroups.Shared.Domain");
    if (!fs.existsSync(sharedDir)) return [];

    const resolved: CsProperty[] = [];
    const visited = new Set<string>();
    const queue = [...baseTypes];

    while (queue.length > 0) {
        const typeName = queue.shift()!;
        if (visited.has(typeName)) continue;
        visited.add(typeName);
        if (/^I[A-Z]/.test(typeName)) continue; // interfaces ignoradas

        const candidate = path.join(sharedDir, `${typeName}.cs`);
        if (!fs.existsSync(candidate)) continue;
        const ancestor = parseCsEntityFile(candidate, "ancestor");
        resolved.push(...ancestor.properties);
        ancestor.baseTypes.forEach(t => queue.push(t));
    }

    return resolved;
}

export function parseEntityWithAncestors(filePath: string, projectRoot: string): ParsedEntity {
    const primary = parseCsEntityFile(filePath, "entity");
    const ancestors = resolveAncestorProperties(primary.baseTypes, projectRoot);

    const merged: CsProperty[] = [...primary.properties];
    const seen = new Set(merged.map(p => p.name));
    for (const anc of ancestors) {
        if (!seen.has(anc.name)) {
            merged.push(anc);
            seen.add(anc.name);
        }
    }

    return { ...primary, properties: merged };
}

/**
 * Localiza el .cs de una entidad dentro de un módulo (o del proyecto entero).
 */
export function findEntityFile(entityName: string, projectRoot: string, preferredModule?: string): string | null {
    const roots: string[] = [];
    if (preferredModule) {
        roots.push(path.join(projectRoot, "Core", preferredModule, `NitroGroups.Core.${preferredModule}.Domain`, "Entities"));
    }
    const coreDir = path.join(projectRoot, "Core");
    if (fs.existsSync(coreDir)) {
        for (const module of fs.readdirSync(coreDir)) {
            roots.push(path.join(coreDir, module, `NitroGroups.Core.${module}.Domain`, "Entities"));
        }
    }

    for (const root of roots) {
        const candidate = path.join(root, `${entityName}.cs`);
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}
