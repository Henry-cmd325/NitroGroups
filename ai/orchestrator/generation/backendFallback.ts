import {
    B2BContract,
    ContractDto,
    ContractField,
    ContractMethod,
    FileOutput,
    toPascalCase
} from "../types";
import { introspectModule, findRepositoryFor, ModuleIntrospection } from "./moduleIntrospector";
import { parseEntityWithAncestors, findEntityFile, ParsedEntity } from "../contract/csEntityParser";
import { buildRealHandler, classifyOperation, buildFieldMappings, FieldMapping } from "./realHandlerBuilder";
import { normalizeB2BContractDtoNamesInPlace } from "../contract/contractNameNormalize";

function mapTypeToCSharp(meta: ContractField): string {
    const format = String(meta?.format || "").toLowerCase();
    if (format === "decimal") return "decimal";
    if (format === "long") return "long";
    if (format === "int") return "int";
    if (format === "uuid") return "Guid";
    if (format === "iso-date") return "DateTimeOffset";

    const type = String(meta?.type || "string").toLowerCase();
    if (type === "number" || type === "integer") return "long";
    if (type === "boolean" || type === "bool") return "bool";
    return "string";
}

function mapDefaultCs(meta: ContractField): string {
    const csType = mapTypeToCSharp(meta);
    if (csType === "decimal") return "0m";
    if (csType === "int" || csType === "long") return "0";
    if (csType === "bool") return "false";
    if (csType === "Guid") return "Guid.Empty";
    if (csType === "DateTimeOffset") return "DateTimeOffset.MinValue";
    return "string.Empty";
}

function buildDtoClass(dto: ContractDto): string {
    const lines: string[] = [];
    lines.push(`public sealed class ${dto.name}`);
    lines.push("{");
    for (const [field, meta] of Object.entries(dto.fields || {})) {
        const csType = mapTypeToCSharp(meta);
        const pascal = toPascalCase(field);
        const defaultValue = csType === "string" ? " = string.Empty;" : "";
        lines.push(`    public ${csType} ${pascal} { get; set; }${defaultValue}`);
    }
    lines.push("}");
    return lines.join("\n");
}

/**
 * Variante que toma los mappings entity↔DTO para propagar nullability del source.
 * Evita errores CS0266 ("decimal? → decimal" implícito) cuando la entidad marca
 * un campo como nullable pero el contrato JSON Schema no lo expresa.
 *
 * Regla: si la propiedad de la entidad es nullable, el DTO también lo es
 *        (excepto para `string`, que en C# es referencia con nullable-enable).
 */
function buildDtoClassFromMappings(dto: ContractDto, mappings: FieldMapping[]): string {
    const byField = new Map(mappings.map(m => [m.dtoField, m]));
    const lines: string[] = [];
    lines.push(`public sealed class ${dto.name}`);
    lines.push("{");
    for (const [field, meta] of Object.entries(dto.fields || {})) {
        const m = byField.get(field);
        const pascal = toPascalCase(field);
        const baseCs = mapTypeToCSharp(meta);
        let csType = baseCs;
        if (m?.entityProperty?.nullable && baseCs !== "string") {
            csType = `${baseCs}?`;
        }
        const defaultValue = (csType === "string") ? " = string.Empty;" : "";
        lines.push(`    public ${csType} ${pascal} { get; set; }${defaultValue}`);
    }
    lines.push("}");
    return lines.join("\n");
}

function isQuery(method: ContractMethod): boolean {
    return String(method.http || "").toUpperCase() === "GET";
}

/** Origen B2B de cada campo (`in`). Sin `in`, GET → query, DELETE → path, resto → body. */
function b2bRequestFieldIn(meta: ContractField, http: string): "path" | "query" | "header" | "body" {
    const m = meta as { in?: string };
    if (m.in === "path" || m.in === "query" || m.in === "header" || m.in === "body") {
        return m.in;
    }
    const h = (http || "GET").toUpperCase();
    if (h === "GET" || h === "HEAD") return "query";
    if (h === "DELETE") return "path";
    return "body";
}

function pathParamNamesInOrder(route: string): string[] {
    const out: string[] = [];
    const re = /\{([^:}]+)(?::[^}]+)?\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(route)) != null) {
        out.push(m[1]!.trim());
    }
    return out;
}

/**
 * Añade `/{foo:long}` a la ruta del contrato para cada `in: path` que no tenga aún segmento.
 */
function extendRouteWithPathFields(baseFromContract: string, method: ContractMethod): string {
    let path = (baseFromContract || "api/contract").replace(/^\//, "");
    const fields = (method.request?.fields || {}) as Record<string, ContractField>;
    const http = String(method.http || "GET");
    const seen = new Set(pathParamNamesInOrder(path));
    for (const [name, meta] of Object.entries(fields)) {
        if (b2bRequestFieldIn(meta, http) !== "path") continue;
        if (seen.has(name)) continue;
        path = `${path}/${routeSegmentForPath(name, meta)}`;
        seen.add(name);
    }
    return path;
}

function routeSegmentForPath(fieldName: string, meta: ContractField): string {
    const f = String((meta as { format?: string })?.format || "").toLowerCase();
    const t = String(meta?.type || "").toLowerCase();
    if (f === "uuid" || t === "string" && f === "uuid") {
        return `{${fieldName}:guid}`;
    }
    if (f === "long" || t === "integer" || t === "number") {
        return `{${fieldName}:long}`;
    }
    if (f === "int") {
        return `{${fieldName}:int}`;
    }
    return `{${fieldName}}`;
}

function httpBodyClassName(requestDtoName: string): string {
    if (requestDtoName.endsWith("Request")) {
        return `${requestDtoName.slice(0, -"Request".length)}Body`;
    }
    return `${requestDtoName}Body`;
}

function headerCSharpName(field: string, _meta: ContractField): string {
    if (field.toLowerCase() === "idempotencykey") {
        return "Idempotency-Key";
    }
    return toPascalCase(field);
}

function buildBodyOnlySealedClass(className: string, bodyFields: [string, ContractField][]): string {
    const lines: string[] = [];
    lines.push(`public sealed class ${className}`);
    lines.push("{");
    for (const [name, m] of bodyFields) {
        const pascal = toPascalCase(name);
        const optional = (m as { required?: boolean }).required === false;
        const t = mapTypeToCSharp(m);
        if (optional) {
            lines.push(`    public ${t}? ${pascal} { get; set; }`);
        } else if (t === "string") {
            lines.push(`    public ${t} ${pascal} { get; set; } = string.Empty;`);
        } else {
            lines.push(`    public ${t} ${pascal} { get; set; }`);
        }
    }
    lines.push("}");
    return lines.join("\n");
}

function normalizeFeatureName(feature: string): { pascal: string; upperOperation: string } {
    const pascal = toPascalCase(feature);
    return { pascal, upperOperation: pascal };
}

/**
 * Carpeta bajo Infrastructure/Endpoints: para APIs bajo /api/groups/ en el módulo
 * Groups usar "Groups" evita el antipatrón `namespace ...Endpoints.GroupMedia` que
 * choca con el tipo de dominio `GroupMedia` (CS0118).
 */
function infrastructureFolderForEndpoint(moduleName: string, contractEndpoint: string, featurePascal: string): string {
    const ep = (contractEndpoint || "").replace(/^\//, "").toLowerCase();
    if (moduleName === "Groups" && ep.startsWith("api/groups/")) {
        return "Groups";
    }
    return featurePascal;
}

function inferOperationToken(method: ContractMethod, featurePascal: string): string {
    const http = String(method.http || "").toUpperCase();
    const mn = (method.name || "").toLowerCase();
    if (http === "GET" && mn.startsWith("list")) {
        return "List";
    }
    if (http === "GET") return "Get";
    if (http === "POST") return "Create";
    if (http === "PUT" || http === "PATCH") return "Update";
    if (http === "DELETE") return "Delete";
    // Fallback: primera palabra del method name
    const name = method.name || `${http.toLowerCase()}${featurePascal}`;
    return toPascalCase(name.replace(new RegExp(featurePascal, "i"), "") || "Execute");
}

function buildCommandOrQuery(method: ContractMethod, featurePascal: string, operation: string): { typeName: string; content: string } {
    const isQ = isQuery(method);
    const suffix = isQ ? "Query" : "Command";
    const marker = isQ ? "IQuery" : "ICommand";

    const responseName = method.response?.name || `${featurePascal}Response`;
    const typeName = `${operation}${featurePascal}${suffix}`;

    const requestFields = method.request?.fields || {};
    const fieldList = Object.entries(requestFields)
        .map(([field, meta]) => `${mapTypeToCSharp(meta)} ${toPascalCase(field)}`)
        .join(", ");

    // Record-based definition
    const signature = fieldList.length > 0
        ? `public record ${typeName}(${fieldList}) : ${marker}<Result<${responseName}>>;`
        : `public record ${typeName}() : ${marker}<Result<${responseName}>>;`;

    return { typeName, content: signature };
}

/** GET + operación `list`: mismo shape de campos que `buildCommandOrQuery` pero `Result<List<...>>`. */
function buildListQueryRecord(method: ContractMethod, featurePascal: string, operation: string): { typeName: string; content: string } {
    const responseName = method.response?.name || `${featurePascal}Response`;
    const typeName = `${operation}${featurePascal}Query`;
    const requestFields = method.request?.fields || {};
    const fieldList = Object.entries(requestFields)
        .map(([field, meta]) => `${mapTypeToCSharp(meta)} ${toPascalCase(field)}`)
        .join(", ");
    const signature = fieldList.length > 0
        ? `public record ${typeName}(${fieldList}) : IQuery<Result<List<${responseName}>>>;`
        : `public record ${typeName}() : IQuery<Result<List<${responseName}>>>;`;
    return { typeName, content: signature };
}

function buildHandler(method: ContractMethod, featurePascal: string, operation: string, moduleName: string, featureSegment: string): { typeName: string; content: string } {
    const isQ = isQuery(method);
    const suffix = isQ ? "Query" : "Command";
    const handlerIface = isQ ? "IQueryHandler" : "ICommandHandler";
    const marker = isQ ? "Query" : "Command";
    const responseName = method.response?.name || `${featurePascal}Response`;
    const responseFields = method.response?.fields || {};
    const typeName = `${operation}${featurePascal}${suffix}`;
    const isList = classifyOperation(method) === "list";

    const returnType = isList ? `Result<List<${responseName}>>` : `Result<${responseName}>`;

    const lines: string[] = [];
    lines.push(`using Cortex.Mediator.${marker === "Query" ? "Queries" : "Commands"};`);
    lines.push(`using NitroGroups.Shared.Contracts;`);
    if (isList) {
        lines.push(`using System.Collections.Generic;`);
    }
    lines.push(``);
    lines.push(`namespace NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation};`);
    lines.push(``);
    lines.push(`public class ${typeName}Handler : ${handlerIface}<${typeName}, ${returnType}>`);
    lines.push(`{`);
    const handlerParam = isQ ? "request" : "command";
    lines.push(`    public Task<${returnType}> Handle(${typeName} ${handlerParam}, CancellationToken cancellationToken)`);
    lines.push(`    {`);
    lines.push(`        // TODO: Implementación mínima determinista. Ajustar con lógica de dominio real.`);
    lines.push(`        var one = new ${responseName}`);
    lines.push(`        {`);
    for (const [field, meta] of Object.entries(responseFields)) {
        lines.push(`            ${toPascalCase(field)} = ${mapDefaultCs(meta)},`);
    }
    if (Object.keys(responseFields).length === 0) {
        // Struct vacío — nada que hacer
    }
    lines.push(`        };`);
    if (isList) {
        lines.push(`        return Task.FromResult(Result<List<${responseName}>>.Success(new List<${responseName}> { one }));`);
    } else {
        lines.push(`        return Task.FromResult(Result<${responseName}>.Success(one));`);
    }
    lines.push(`    }`);
    lines.push(`}`);
    return { typeName: `${typeName}Handler`, content: lines.join("\n") };
}

/**
 * Construye el endpoint .NET: **a lo sumo un** `[FromBody]`, ruta mínima con `{param:tipo}`,
 * query/header según B2B. Evita ASP0024 (múltiples FromBody) y códigos inválidos del LLM.
 */
function buildEndpoint(
    method: ContractMethod,
    contract: B2BContract,
    featurePascal: string,
    operation: string,
    moduleName: string,
    featureSegment: string,
    infrastructureSegment: string,
    queryOrCommandName: string,
    listResponse = false
): { typeName: string; content: string; bodyDtoFiles: FileOutput[] } {
    const http = String(method.http || "GET").toUpperCase();
    const mapMethod = `Map${http.charAt(0)}${http.slice(1).toLowerCase()}`;
    const responseName = method.response?.name || `${featurePascal}Response`;
    const isQ = isQuery(method);
    const marker = isQ ? "Query" : "Command";
    const sendFn = isQ ? "SendQueryAsync" : "SendCommandAsync";
    const requestFields = (method.request?.fields || {}) as Record<string, ContractField>;

    const pathFields: [string, ContractField][] = [];
    const queryFields: [string, ContractField][] = [];
    const headerFields: [string, ContractField][] = [];
    const bodyFields: [string, ContractField][] = [];
    for (const e of Object.entries(requestFields)) {
        const [k, m] = e;
        const loc = b2bRequestFieldIn(m, http);
        if (loc === "path") pathFields.push(e);
        else if (loc === "query") queryFields.push(e);
        else if (loc === "header") headerFields.push(e);
        else bodyFields.push(e);
    }

    const bodyDtoFiles: FileOutput[] = [];
    let bodyClassName = "";
    if (!isQ && bodyFields.length > 0) {
        bodyClassName = httpBodyClassName(method.request?.name || `${operation}${featurePascal}Request`);
        const classBody = buildBodyOnlySealedClass(bodyClassName, bodyFields);
        const applicationNs = `NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation}`;
        const bodyPath = `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application/UseCases/${featureSegment}/${operation}/${bodyClassName}.cs`;
        bodyDtoFiles.push({
            path: bodyPath,
            content: `namespace ${applicationNs};\n\n${classBody}\n`
        });
    }

    const route = extendRouteWithPathFields(contract.endpoint, method);
    const paramLines: string[] = [];
    const preCommandLines: string[] = [];
    const ctorParts: string[] = [];

    const orderPath = pathParamNamesInOrder(route);
    for (const pName of orderPath) {
        const ent = pathFields.find(([f]) => f === pName);
        if (!ent) {
            continue;
        }
        const [field, m] = ent;
        const cs = mapTypeToCSharp(m);
        const camel = field.charAt(0).toLowerCase() + field.slice(1);
        const seg = routeSegmentForPath(field, m);
        const t = /:long/.test(seg) ? "long" : /:guid/.test(seg) ? "Guid" : /:int/.test(seg) ? "int" : cs;
        paramLines.push(`            ${t} ${camel}`);
    }
    for (const [field, m] of queryFields) {
        const optional = (m as { required?: boolean }).required === false;
        const cs = mapTypeToCSharp(m) + (optional ? "?" : "");
        const camel = field.charAt(0).toLowerCase() + field.slice(1);
        paramLines.push(`            [FromQuery] ${cs} ${camel}`);
    }
    for (const [field, m] of headerFields) {
        const hname = headerCSharpName(field, m);
        const fmt = String((m as { format?: string })?.format || "").toLowerCase();
        const camel = field.charAt(0).toLowerCase() + field.slice(1);
        if (fmt === "uuid") {
            paramLines.push(`            [FromHeader(Name = "${hname}")] string ${camel}`);
        } else {
            const cs = mapTypeToCSharp(m);
            paramLines.push(`            [FromHeader(Name = "${hname}")] ${cs} ${camel}`);
        }
    }
    if (!isQ && bodyFields.length > 0) {
        paramLines.push(`            [FromBody] ${bodyClassName} body`);
    }
    paramLines.push("            IMediator mediator");

    for (const [field, meta] of Object.entries(requestFields)) {
        const loc = b2bRequestFieldIn(meta, http);
        const pascal = toPascalCase(field);
        const camel = field.charAt(0).toLowerCase() + field.slice(1);
        if (loc === "path") {
            ctorParts.push(camel);
        } else if (loc === "query") {
            ctorParts.push(camel);
        } else if (loc === "header") {
            const fmt = String((meta as { format?: string })?.format || "").toLowerCase();
            if (fmt === "uuid") {
                if (!preCommandLines.some(l => l.includes(`g_${field}`))) {
                    preCommandLines.push(
                        `            if (!Guid.TryParse(${camel} ?? "", out var g_${field})) return Results.BadRequest("Cabecera '${field}' requerida (GUID).");`
                    );
                }
                ctorParts.push(`g_${field}`);
            } else {
                ctorParts.push(camel);
            }
        } else {
            if (bodyFields.length > 0) {
                if ((meta as { required?: boolean }).required === false) {
                    ctorParts.push(`body.${pascal} ?? string.Empty`);
                } else {
                    const t = mapTypeToCSharp(meta);
                    if (t === "string") {
                        ctorParts.push(`body.${pascal}`);
                    } else {
                        ctorParts.push(`body.${pascal}`);
                    }
                }
            }
        }
    }

    const applicationNs2 = `NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation}`;

    const lines: string[] = [];
    lines.push(`using Cortex.Mediator;`);
    lines.push(`using Microsoft.AspNetCore.Builder;`);
    lines.push(`using Microsoft.AspNetCore.Http;`);
    lines.push(`using Microsoft.AspNetCore.Routing;`);
    lines.push(`using Microsoft.AspNetCore.Mvc;`);
    if (!isQ && bodyClassName) {
        lines.push(`using ${applicationNs2};`);
    }
    lines.push(`using NitroGroups.Shared.EndpointMapping;`);
    lines.push(`using NitroGroups.Shared.Contracts;`);
    lines.push(``);
    lines.push(`namespace NitroGroups.Core.${moduleName}.Infrastructure.Endpoints.${infrastructureSegment};`);
    lines.push(``);
    lines.push(`public class ${operation} : IEndpoint`);
    lines.push(`{`);
    lines.push(`    public void MapEndpoint(IEndpointRouteBuilder app)`);
    lines.push(`    {`);
    lines.push(`        app.${mapMethod}("${route}", async (`);
    lines.push(paramLines.join(",\n"));
    lines.push(`        ) =>`);
    lines.push(`        {`);
    for (const pl of preCommandLines) {
        lines.push(pl);
    }
    const ctor = ctorParts.length > 0 ? ctorParts.join(", ") : "";
    lines.push(
        `            var ${marker.toLowerCase()} = new ${queryOrCommandName}(${ctor || ""});`
    );
    const mediatorResultType = listResponse
        ? `Result<List<${responseName}>>`
        : `Result<${responseName}>`;
    lines.push(
        `            var result = await mediator.${sendFn}<${queryOrCommandName}, ${mediatorResultType}>(${marker.toLowerCase()});`
    );
    lines.push(`            return result.IsFailure ? Results.BadRequest(result.Error) : Results.Ok(result.Value);`);
    lines.push(`        })`);
    lines.push(`        .WithTags("${featurePascal}");`);
    lines.push(`    }`);
    lines.push(`}`);

    return { typeName: operation, content: lines.join("\n"), bodyDtoFiles };
}

function buildDtoFile(dto: ContractDto, moduleName: string, featureSegment: string, operation: string, mappings?: FieldMapping[]): FileOutput {
    // DTOs conviven en el mismo folder/namespace que Query/Handler/Endpoint de la operación,
    // garantizando compilación sin `using` adicionales cruzados.
    const classBody = mappings ? buildDtoClassFromMappings(dto, mappings) : buildDtoClass(dto);
    const content = `namespace NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation};\n\n${classBody}\n`;
    return {
        path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application/UseCases/${featureSegment}/${operation}/${dto.name}.cs`,
        content
    };
}

export interface BackendFallbackContext {
    projectRoot: string;
    /** Nombre explícito de la entidad a usar (e.g. "GroupAvailability"). Si no se provee, se intenta inferir a partir del feature pascal. */
    entityName?: string;
}

/**
 * Construye una implementación backend mínima, compilable y consistente con
 * los vertical slices existentes (`Schedules`). Úsalo cuando la generación IA
 * produzca archivos inválidos o faltantes que el repair-loop no pudo rescatar.
 *
 * Si se pasa `ctx`, el fallback intenta inyectar el repositorio real del módulo
 * y emitir un handler no-stub: `GetAllAsync`/`GetByIdAsync` + mapper entity→DTO.
 * Si no hay repo disponible, recae al handler stub con TODO.
 */
export function buildDeterministicBackend(
    feature: string,
    contract: B2BContract,
    moduleName: string,
    ctx?: BackendFallbackContext
): FileOutput[] {
    normalizeB2BContractDtoNamesInPlace(contract);
    const { pascal: featurePascal } = normalizeFeatureName(feature);
    const featureSegment = featurePascal;
    const infrastructureSegment = infrastructureFolderForEndpoint(
        moduleName,
        contract.endpoint || "",
        featurePascal
    );
    const files: FileOutput[] = [];

    let intro: ModuleIntrospection | null = null;
    let entity: ParsedEntity | null = null;
    if (ctx) {
        intro = introspectModule(moduleName, ctx.projectRoot);
        const entityGuess = ctx.entityName || featurePascal;
        const entityFile = findEntityFile(entityGuess, ctx.projectRoot, moduleName) || findEntityFile(`Group${entityGuess}`, ctx.projectRoot, moduleName);
        if (entityFile) {
            try { entity = parseEntityWithAncestors(entityFile, ctx.projectRoot); } catch { entity = null; }
        }
    }

    for (const method of contract.methods || []) {
        const operation = inferOperationToken(method, featurePascal);
        const op = classifyOperation(method);

        let handlerFile: FileOutput;
        let queryOrCommandFile: FileOutput;
        let endpointFile: FileOutput;
        const bodyDtosFromEndpoint: FileOutput[] = [];

        // 1) Handler real si hay contexto disponible
        const repo = (intro && entity) ? findRepositoryFor(intro, entity.entityName, featurePascal) : null;
        const useReal = !!(intro && entity && repo && op !== "unsupported");

        const toQueryFile = (typeName: string, body: string) => ({
            path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application/UseCases/${featureSegment}/${operation}/${typeName}.cs`,
            content: `using Cortex.Mediator.${isQuery(method) ? "Queries" : "Commands"};\nusing NitroGroups.Shared.Contracts;\n\nnamespace NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation};\n\n${body}\n`
        });

        if (useReal) {
            handlerFile = buildRealHandler({
                moduleIntro: intro!,
                repo: repo!,
                entity: entity!,
                contract,
                method,
                featurePascal,
                featureSegment,
                operation,
                moduleName
            });

            if (op === "list") {
                const queryOrCommand = buildListQueryRecord(method, featurePascal, operation);
                const endpoint = buildEndpoint(
                    method,
                    contract,
                    featurePascal,
                    operation,
                    moduleName,
                    featureSegment,
                    infrastructureSegment,
                    queryOrCommand.typeName,
                    true
                );
                bodyDtosFromEndpoint.push(...endpoint.bodyDtoFiles);
                queryOrCommandFile = toQueryFile(queryOrCommand.typeName, queryOrCommand.content);
                endpointFile = {
                    path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Infrastructure/Endpoints/${infrastructureSegment}/${operation}.cs`,
                    content: endpoint.content + "\n"
                };
            } else {
                const queryOrCommand = buildCommandOrQuery(method, featurePascal, operation);
                const endpoint = buildEndpoint(
                    method,
                    contract,
                    featurePascal,
                    operation,
                    moduleName,
                    featureSegment,
                    infrastructureSegment,
                    queryOrCommand.typeName,
                    false
                );
                bodyDtosFromEndpoint.push(...endpoint.bodyDtoFiles);
                queryOrCommandFile = toQueryFile(queryOrCommand.typeName, queryOrCommand.content);
                endpointFile = {
                    path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Infrastructure/Endpoints/${infrastructureSegment}/${operation}.cs`,
                    content: endpoint.content + "\n"
                };
            }
        } else if (op === "list") {
            const queryOrCommand = buildListQueryRecord(method, featurePascal, operation);
            const stubHandler = buildHandler(method, featurePascal, operation, moduleName, featureSegment);
            const endpoint = buildEndpoint(
                method,
                contract,
                featurePascal,
                operation,
                moduleName,
                featureSegment,
                infrastructureSegment,
                queryOrCommand.typeName,
                true
            );
            bodyDtosFromEndpoint.push(...endpoint.bodyDtoFiles);
            queryOrCommandFile = toQueryFile(queryOrCommand.typeName, queryOrCommand.content);
            handlerFile = {
                path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application/UseCases/${featureSegment}/${operation}/${stubHandler.typeName}.cs`,
                content: stubHandler.content + "\n"
            };
            endpointFile = {
                path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Infrastructure/Endpoints/${infrastructureSegment}/${operation}.cs`,
                content: endpoint.content + "\n"
            };
        } else {
            const queryOrCommand = buildCommandOrQuery(method, featurePascal, operation);
            const stubHandler = buildHandler(method, featurePascal, operation, moduleName, featureSegment);
            const endpoint = buildEndpoint(
                method,
                contract,
                featurePascal,
                operation,
                moduleName,
                featureSegment,
                infrastructureSegment,
                queryOrCommand.typeName,
                false
            );
            bodyDtosFromEndpoint.push(...endpoint.bodyDtoFiles);
            queryOrCommandFile = toQueryFile(queryOrCommand.typeName, queryOrCommand.content);
            handlerFile = {
                path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application/UseCases/${featureSegment}/${operation}/${stubHandler.typeName}.cs`,
                content: stubHandler.content + "\n"
            };
            endpointFile = {
                path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Infrastructure/Endpoints/${infrastructureSegment}/${operation}.cs`,
                content: endpoint.content + "\n"
            };
        }

        files.push(queryOrCommandFile, handlerFile, endpointFile, ...bodyDtosFromEndpoint);

        if (method.request) {
            const requestMappings = (useReal && entity) ? buildFieldMappings(method.request, entity) : undefined;
            files.push(buildDtoFile(method.request, moduleName, featureSegment, operation, requestMappings));
        }
        if (method.response) {
            const responseMappings = (useReal && entity) ? buildFieldMappings(method.response, entity) : undefined;
            files.push(buildDtoFile(method.response, moduleName, featureSegment, operation, responseMappings));
        }
    }

    return files;
}
