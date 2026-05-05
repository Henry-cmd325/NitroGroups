"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairStructuralIssues = void 0;
const types_1 = require("../types");
function mapTypeToTs(meta) {
    const type = String(meta?.type || "string").toLowerCase();
    if (type === "number" || type === "integer")
        return "number";
    if (type === "boolean" || type === "bool")
        return "boolean";
    return "string";
}
function mapTypeToCSharp(meta) {
    const format = String(meta?.format || "").toLowerCase();
    if (format === "decimal")
        return "decimal";
    if (format === "long")
        return "long";
    if (format === "int")
        return "int";
    if (format === "uuid")
        return "Guid";
    if (format === "iso-date")
        return "DateTimeOffset";
    const type = String(meta?.type || "string").toLowerCase();
    if (type === "number" || type === "integer")
        return "long";
    if (type === "boolean" || type === "bool")
        return "bool";
    return "string";
}
function findDtoMeta(contract, dtoName) {
    for (const method of contract.methods || []) {
        if (method.request?.name === dtoName)
            return method.request;
        if (method.response?.name === dtoName)
            return method.response;
    }
    return null;
}
/**
 * Reemplaza el tipo C# de un campo existente dentro de un DTO.
 * Ej: `public string StartAt { get; set; }` → `public DateTimeOffset StartAt { get; set; }`.
 * Soporta tanto clases con cuerpo como records posicionales.
 * Devuelve changed=false si no encuentra el campo (fuerza fallback upstream).
 */
function replaceCsharpFieldType(content, typeName, fieldName, newCsType) {
    const pascal = (0, types_1.toPascalCase)(fieldName);
    // Record posicional: (long Id, string Name, ...)
    const positionalRecordRegex = new RegExp(`((?:public\\s+)?(?:sealed\\s+)?record\\s+${typeName}\\s*\\()([^)]*)(\\))`);
    const positional = positionalRecordRegex.exec(content);
    if (positional) {
        const params = positional[2];
        const paramRegex = new RegExp(`(^|,\\s*)([A-Za-z_][\\w.?<>]*)(\\s+${pascal}\\b)`);
        if (paramRegex.test(params)) {
            const newParams = params.replace(paramRegex, (_match, sep, _oldType, tail) => `${sep}${newCsType}${tail}`);
            if (newParams !== params) {
                const before = content.slice(0, positional.index);
                const after = content.slice(positional.index + positional[0].length);
                return { changed: true, content: `${before}${positional[1]}${newParams}${positional[3]}${after}` };
            }
        }
    }
    // Clase/record con cuerpo: `public <Type> Name { get; set; } [= ...]`
    const classPropRegex = new RegExp(`(public\\s+)([A-Za-z_][\\w.?<>]*)(\\s+${pascal}\\s*\\{\\s*get\\s*;\\s*set\\s*;\\s*\\}[^\\n;]*;?)`, "m");
    // Acotamos al bloque del DTO para no pisar otros campos con el mismo nombre en otro DTO.
    const blockStart = new RegExp(`(?:record|class)\\s+${typeName}\\b[^\\n]*\\n\\{`, "m").exec(content);
    if (blockStart) {
        let depth = 0;
        let started = false;
        let end = -1;
        for (let i = blockStart.index; i < content.length; i++) {
            const ch = content[i];
            if (ch === "{") {
                depth++;
                started = true;
            }
            else if (ch === "}") {
                depth--;
                if (started && depth === 0) {
                    end = i + 1;
                    break;
                }
            }
        }
        if (end > 0) {
            const blockContent = content.slice(blockStart.index, end);
            const match = classPropRegex.exec(blockContent);
            if (match) {
                const rebuilt = blockContent.replace(classPropRegex, `$1${newCsType}$3`);
                if (rebuilt !== blockContent) {
                    return {
                        changed: true,
                        content: content.slice(0, blockStart.index) + rebuilt + content.slice(end)
                    };
                }
            }
        }
    }
    return { changed: false, content };
}
function insertCsharpField(content, typeName, fieldName, csType) {
    const pascal = (0, types_1.toPascalCase)(fieldName);
    // Caso 1: record posicional: public record Foo(long Id, string Name);
    const positionalRecordRegex = new RegExp(`((?:public\\s+)?(?:sealed\\s+)?record\\s+${typeName}\\s*)\\(([^)]*)\\)`);
    const positional = positionalRecordRegex.exec(content);
    if (positional) {
        const params = positional[2].trim();
        if (new RegExp(`\\b${pascal}\\b`).test(params)) {
            return { changed: false, content };
        }
        const insertion = `${csType} ${pascal}`;
        const newParams = params.length === 0 ? insertion : `${params}, ${insertion}`;
        const before = content.slice(0, positional.index);
        const after = content.slice(positional.index + positional[0].length);
        return { changed: true, content: `${before}${positional[1]}(${newParams})${after}` };
    }
    // Caso 2: class/record con cuerpo {}
    const blockRegex = new RegExp(`(?:public\\s+)?(?:sealed\\s+)?(?:record|class)\\s+${typeName}\\b[^\\n]*\\n`, "m");
    const headerMatch = blockRegex.exec(content);
    if (!headerMatch)
        return { changed: false, content };
    let depth = 0;
    let started = false;
    let openBraceIdx = -1;
    let closeBraceIdx = -1;
    for (let i = headerMatch.index; i < content.length; i++) {
        const ch = content[i];
        if (ch === "{") {
            if (!started)
                openBraceIdx = i;
            depth++;
            started = true;
        }
        else if (ch === "}") {
            depth--;
            if (started && depth === 0) {
                closeBraceIdx = i;
                break;
            }
        }
    }
    if (openBraceIdx === -1 || closeBraceIdx === -1)
        return { changed: false, content };
    const body = content.slice(openBraceIdx + 1, closeBraceIdx);
    if (new RegExp(`\\b${pascal}\\b`).test(body)) {
        return { changed: false, content };
    }
    const indentMatch = body.match(/\n([ \t]+)[^\s]/);
    const indent = indentMatch ? indentMatch[1] : "    ";
    const newLine = `\n${indent}public ${csType} ${pascal} { get; set; }`;
    const prefixTrimmed = body.replace(/\s+$/, "");
    const newBody = `${prefixTrimmed}${newLine}\n`;
    return {
        changed: true,
        content: content.slice(0, openBraceIdx + 1) + newBody + content.slice(closeBraceIdx)
    };
}
function insertTsField(content, typeName, fieldName, tsType) {
    const headerRegex = new RegExp(`export\\s+(interface|type)\\s+${typeName}\\b[^\\n]*\\{`, "m");
    const match = headerRegex.exec(content);
    if (!match)
        return { changed: false, content };
    let depth = 0;
    let started = false;
    let openBraceIdx = -1;
    let closeBraceIdx = -1;
    for (let i = match.index; i < content.length; i++) {
        const ch = content[i];
        if (ch === "{") {
            if (!started)
                openBraceIdx = i;
            depth++;
            started = true;
        }
        else if (ch === "}") {
            depth--;
            if (started && depth === 0) {
                closeBraceIdx = i;
                break;
            }
        }
    }
    if (openBraceIdx === -1 || closeBraceIdx === -1)
        return { changed: false, content };
    const body = content.slice(openBraceIdx + 1, closeBraceIdx);
    if (new RegExp(`\\b${fieldName}\\s*\\??:`).test(body)) {
        return { changed: false, content };
    }
    const indentMatch = body.match(/\n([ \t]+)[^\s]/);
    const indent = indentMatch ? indentMatch[1] : "  ";
    const prefixTrimmed = body.replace(/\s+$/, "");
    const newLine = `\n${indent}${fieldName}: ${tsType};`;
    const newBody = `${prefixTrimmed}${newLine}\n`;
    return {
        changed: true,
        content: content.slice(0, openBraceIdx + 1) + newBody + content.slice(closeBraceIdx)
    };
}
/**
 * Repara issues estructurales aplicando cambios directos sobre los DTO reales.
 * No crea archivos parche: si no encuentra el DTO destino, devuelve changed=false para
 * forzar fallback determinista upstream.
 */
function repairStructuralIssues(files, contract, issues) {
    const applied = [];
    const updated = files.map(file => ({ ...file }));
    let changedAny = false;
    for (const issue of issues) {
        if (issue.code !== "B2B_FIELD_MISSING" && issue.code !== "B2B_TYPE_MISMATCH")
            continue;
        if (!issue.dto || !issue.field)
            continue;
        const dtoMeta = findDtoMeta(contract, issue.dto);
        const fieldMeta = dtoMeta?.fields?.[issue.field];
        if (!fieldMeta)
            continue;
        const targetFileIdx = updated.findIndex(file => {
            const ext = (0, types_1.normalizeToPosix)(file.path).toLowerCase();
            if (issue.lang === "TS") {
                if (!ext.endsWith(".ts") && !ext.endsWith(".tsx"))
                    return false;
                return new RegExp(`export\\s+(interface|type)\\s+${issue.dto}\\b`).test(file.content);
            }
            if (!ext.endsWith(".cs"))
                return false;
            return new RegExp(`(?:record|class)\\s+${issue.dto}\\b`).test(file.content);
        });
        if (targetFileIdx === -1)
            continue;
        const target = updated[targetFileIdx];
        if (issue.code === "B2B_FIELD_MISSING") {
            const result = issue.lang === "TS"
                ? insertTsField(target.content, issue.dto, issue.field, mapTypeToTs(fieldMeta))
                : insertCsharpField(target.content, issue.dto, issue.field, mapTypeToCSharp(fieldMeta));
            if (result.changed) {
                updated[targetFileIdx] = { ...target, content: result.content };
                applied.push(`+${issue.lang} ${issue.dto}.${issue.field}`);
                changedAny = true;
            }
        }
        else if (issue.code === "B2B_TYPE_MISMATCH" && issue.lang === "C#") {
            // Repair dirigido: reemplaza solo el tipo del campo, preservando el resto
            // del handler/DTO generado por el LLM. Evita tener que rebuildear todo el
            // backend vía fallback determinista cuando el LLM acertó en todo lo demás.
            const result = replaceCsharpFieldType(target.content, issue.dto, issue.field, mapTypeToCSharp(fieldMeta));
            if (result.changed) {
                updated[targetFileIdx] = { ...target, content: result.content };
                applied.push(`~C# ${issue.dto}.${issue.field}:${mapTypeToCSharp(fieldMeta)}`);
                changedAny = true;
            }
        }
        // B2B_TYPE_MISMATCH en TS no se auto-repara aquí; el fallback frontend lo reescribe.
    }
    return { changed: changedAny, files: updated, applied };
}
exports.repairStructuralIssues = repairStructuralIssues;
