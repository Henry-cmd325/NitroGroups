import fs from "fs";
import path from "path";
import {
    B2BContract,
    ContractDto,
    ContractField,
    ContractMethod,
    FileOutput,
    StructuralIssue,
    StructuralReport,
    normalizeToPosix
} from "../types";

function collectTsPathsRecursive(dir: string): string[] {
    const out: string[] = [];
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            out.push(...collectTsPathsRecursive(full));
        } else if (/\.tsx?$/i.test(ent.name)) {
            out.push(full);
        }
    }
    return out;
}

const FORMAT_TO_CSHARP: Record<string, string[]> = {
    decimal: ["decimal", "decimal?"],
    long: ["long", "long?", "int", "int?"],
    int: ["int", "int?", "long", "long?"],
    uuid: ["Guid", "Guid?"],
    "iso-date": ["DateTime", "DateTime?", "DateTimeOffset", "DateTimeOffset?"],
    "iso-date-time": ["DateTime", "DateTime?", "DateTimeOffset", "DateTimeOffset?"],
    "iso-currency": ["string", "string?"]
};

const FORMAT_TO_TS: Record<string, string[]> = {
    decimal: ["number"],
    long: ["number"],
    int: ["number"],
    uuid: ["string"],
    "iso-date": ["string"],
    "iso-currency": ["string"]
};

function extractCsTypeBlock(content: string, typeName: string): string | null {
    const regex = new RegExp(`(?:public\\s+)?(?:sealed\\s+)?(?:record|class)\\s+${typeName}\\b[^\\n]*(?:\\([^)]*\\))?`, "m");
    const match = regex.exec(content);
    if (!match) return null;

    const startIndex = match.index + match[0].length;
    // record con sintaxis posicional: record Foo(long Id, string Name);
    if (match[0].includes("(")) {
        return match[0];
    }

    // Clase/record con cuerpo {}
    let depth = 0;
    let started = false;
    let end = -1;
    for (let i = match.index; i < content.length; i++) {
        const ch = content[i];
        if (ch === "{") {
            depth++;
            started = true;
        } else if (ch === "}") {
            depth--;
            if (started && depth === 0) {
                end = i + 1;
                break;
            }
        }
    }
    if (end === -1) return null;
    return content.slice(startIndex, end);
}

function extractTsInterfaceBlock(content: string, typeName: string): string | null {
    const regex = new RegExp(`export\\s+(?:interface|type)\\s+${typeName}\\b[^\\n]*(?:=\\s*{|\\{)`, "m");
    const match = regex.exec(content);
    if (!match) return null;

    let depth = 0;
    let started = false;
    let end = -1;
    for (let i = match.index; i < content.length; i++) {
        const ch = content[i];
        if (ch === "{") {
            depth++;
            started = true;
        } else if (ch === "}") {
            depth--;
            if (started && depth === 0) {
                end = i + 1;
                break;
            }
        }
    }
    if (end === -1) return null;
    return content.slice(match.index, end);
}

function csFieldRegex(fieldName: string): RegExp {
    const pascal = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    // Propiedad: public <Type> Name { get; set; }
    // Parámetro de record: (Type Name, ...)
    return new RegExp(`\\b([A-Za-z_][\\w.?<>]*)\\s+${pascal}\\b`);
}

function tsFieldRegex(fieldName: string): RegExp {
    return new RegExp(`\\b${fieldName}\\b\\s*\\??\\s*:\\s*([^;\\n,)}]+)`);
}

function checkCsharpType(detectedType: string, format?: string, jsType?: string): boolean {
    if (format && FORMAT_TO_CSHARP[format]) {
        return FORMAT_TO_CSHARP[format].some(type => detectedType === type || detectedType.startsWith(type));
    }
    if (jsType === "string") return /^(string\??|Guid\??|DateTime\??|DateTimeOffset\??)/.test(detectedType);
    if (jsType === "number" || jsType === "integer") return /^(int|long|short|double|float|decimal)\??$/.test(detectedType);
    if (jsType === "boolean" || jsType === "bool") return /^bool\??$/.test(detectedType);
    return true;
}

function checkTsType(detectedType: string, format?: string, jsType?: string): boolean {
    const normalized = detectedType.trim().replace(/\s+/g, " ").replace(/\|.*$/, "").trim();
    if (format && FORMAT_TO_TS[format]) {
        return FORMAT_TO_TS[format].some(type => normalized === type);
    }
    if (jsType === "string") {
        if (/^string/.test(normalized)) return true;
        // El LLM a veces declara "asc" | "desc" (o basura al final) en vez de `string`
        // — sigue siendo un subtipo de string y pasa en runtime.
        const raw = detectedType.trim();
        if (raw.startsWith(`"`) || raw.startsWith(`'`)) return true;
        return false;
    }
    if (jsType === "number" || jsType === "integer") return /^number/.test(normalized);
    if (jsType === "boolean" || jsType === "bool") return /^boolean/.test(normalized);
    return true;
}

interface DtoLocation {
    file: FileOutput;
    block: string;
}

function findCsDto(files: FileOutput[], dto: ContractDto): DtoLocation | null {
    for (const file of files) {
        const normalized = normalizeToPosix(file.path);
        if (!normalized.toLowerCase().endsWith(".cs")) continue;
        const block = extractCsTypeBlock(file.content, dto.name);
        if (block !== null) return { file, block };
    }
    return null;
}

function findTsDto(files: FileOutput[], dto: ContractDto): DtoLocation | null {
    for (const file of files) {
        const normalized = normalizeToPosix(file.path).toLowerCase();
        if (!normalized.endsWith(".ts") && !normalized.endsWith(".tsx")) continue;
        const block = extractTsInterfaceBlock(file.content, dto.name);
        if (block !== null) return { file, block };
    }
    return null;
}

function validateDtoInCs(dto: ContractDto, location: DtoLocation, issues: StructuralIssue[]): void {
    for (const [field, meta] of Object.entries(dto.fields)) {
        const regex = csFieldRegex(field);
        const match = regex.exec(location.block);
        if (!match) {
            issues.push({
                code: "B2B_FIELD_MISSING",
                message: `Campo '${field}' no encontrado en DTO C# '${dto.name}'.`,
                field,
                dto: dto.name,
                lang: "C#",
                severity: "error"
            });
            continue;
        }

        const detectedType = match[1];
        if (!checkCsharpType(detectedType, meta.format, meta.type)) {
            issues.push({
                code: "B2B_TYPE_MISMATCH",
                message: `Campo '${field}' en DTO C# '${dto.name}' tiene tipo '${detectedType}' incompatible con (type='${meta.type}', format='${meta.format || "-"}').`,
                field,
                dto: dto.name,
                lang: "C#",
                severity: "error"
            });
        }
    }
}

function validateDtoInTs(dto: ContractDto, location: DtoLocation, issues: StructuralIssue[]): void {
    for (const [field, meta] of Object.entries(dto.fields)) {
        const regex = tsFieldRegex(field);
        const match = regex.exec(location.block);
        if (!match) {
            issues.push({
                code: "B2B_FIELD_MISSING",
                message: `Campo '${field}' no encontrado en interfaz TS '${dto.name}'.`,
                field,
                dto: dto.name,
                lang: "TS",
                severity: "error"
            });
            continue;
        }

        const detectedType = match[1];
        if (!checkTsType(detectedType, meta.format, meta.type)) {
            issues.push({
                code: "B2B_TYPE_MISMATCH",
                message: `Campo '${field}' en TS '${dto.name}' tiene tipo '${detectedType.trim()}' incompatible con contrato (type='${meta.type}', format='${meta.format || "-"}').`,
                field,
                dto: dto.name,
                lang: "TS",
                severity: "error"
            });
        }
    }
}

function validateEndpointReference(
    contract: B2BContract,
    tsFiles: FileOutput[],
    issues: StructuralIssue[],
    diskFallback?: { projectRoot: string; feature: string }
): void {
    const endpoint = String(contract.endpoint || "");
    if (!endpoint) return;
    const shortened = endpoint.replace(/^\/api/, "");
    let referenced = tsFiles.some(file => file.content.includes(endpoint) || file.content.includes(shortened));
    if (!referenced && diskFallback?.projectRoot && diskFallback?.feature) {
        const base = path.join(
            diskFallback.projectRoot,
            "UI",
            "nitro-groups",
            "src",
            "features",
            diskFallback.feature
        );
        try {
            for (const fp of collectTsPathsRecursive(base)) {
                const content = fs.readFileSync(fp, "utf8");
                if (content.includes(endpoint) || content.includes(shortened)) {
                    referenced = true;
                    break;
                }
            }
        } catch {
            /* ignore disk errors */
        }
    }
    if (!referenced) {
        issues.push({
            code: "B2B_ROUTE_MISMATCH",
            message: `El frontend no referencia el endpoint '${endpoint}'.`,
            severity: "error"
        });
    }
}

function validateBackendEndpointMethod(method: ContractMethod, csFiles: FileOutput[], issues: StructuralIssue[]): void {
    const http = String(method.http || "").toUpperCase();
    if (!http) return;
    const mapCall = `MapMethodPlaceholder_${http}`; // reserved for lookup, not used directly

    const expected = `Map${http.charAt(0)}${http.slice(1).toLowerCase()}`;
    const anyEndpoint = csFiles.some(file => {
        const normalized = normalizeToPosix(file.path).toLowerCase();
        if (!normalized.includes("/endpoints/")) return false;
        return file.content.includes(expected + "(") || file.content.includes(`app.${expected}(`);
    });
    if (!anyEndpoint) {
        issues.push({
            code: "B2B_BACKEND_ENDPOINT_MISSING",
            message: `No se encontró un endpoint .NET (${expected}) para el método '${method.name}' (${http}).`,
            severity: "error"
        });
    }
}

export interface StructuralValidationOptions {
    includeBackend: boolean;
    includeFrontend: boolean;
    /**
     * Si el listado solo mira `files` generados en memoria, el FE existente en disco
     * (p. ej. `features/groupMedia/types/...` con la constante B2B) no se ve y dispara
     * B2B_ROUTE_MISMATCH en falso. Opcional: escanea esa carpeta en disco.
     */
    frontendEndpointDiskFallback?: { projectRoot: string; feature: string };
}

export function validateB2BStructural(
    contract: B2BContract,
    files: FileOutput[],
    options: StructuralValidationOptions
): StructuralReport {
    const issues: StructuralIssue[] = [];

    const csFiles = files.filter(file => normalizeToPosix(file.path).toLowerCase().endsWith(".cs"));
    const tsFiles = files.filter(file => {
        const ext = normalizeToPosix(file.path).toLowerCase();
        return ext.endsWith(".ts") || ext.endsWith(".tsx");
    });

    if (options.includeFrontend) {
        validateEndpointReference(contract, tsFiles, issues, options.frontendEndpointDiskFallback);
    }

    for (const method of contract.methods || []) {
        if (options.includeBackend) {
            validateBackendEndpointMethod(method, csFiles, issues);

            for (const dto of [method.request, method.response].filter(Boolean) as ContractDto[]) {
                const loc = findCsDto(csFiles, dto);
                if (!loc) {
                    issues.push({
                        code: "B2B_DTO_MISSING",
                        message: `DTO C# '${dto.name}' no encontrado en backend generado.`,
                        dto: dto.name,
                        lang: "C#",
                        severity: "error"
                    });
                } else {
                    validateDtoInCs(dto, loc, issues);
                }
            }
        }

        if (options.includeFrontend) {
            for (const dto of [method.request, method.response].filter(Boolean) as ContractDto[]) {
                const loc = findTsDto(tsFiles, dto);
                if (!loc) {
                    issues.push({
                        code: "B2B_DTO_MISSING",
                        message: `Interfaz TS '${dto.name}' no encontrada en frontend generado.`,
                        dto: dto.name,
                        lang: "TS",
                        severity: "error"
                    });
                } else {
                    validateDtoInTs(dto, loc, issues);
                }
            }
        }
    }

    return {
        ok: issues.filter(issue => issue.severity === "error").length === 0,
        issues
    };
}

export function summarizeIssues(issues: StructuralIssue[]): string {
    return issues.map(issue => `[${issue.code}] ${issue.message}`).join("\n");
}

// Helper para tests y lookup manual
export const __internal__ = { extractCsTypeBlock, extractTsInterfaceBlock };
