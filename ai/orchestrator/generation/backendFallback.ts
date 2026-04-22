import {
    B2BContract,
    ContractDto,
    ContractField,
    ContractMethod,
    FileOutput,
    toPascalCase
} from "../types";

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

function isQuery(method: ContractMethod): boolean {
    return String(method.http || "").toUpperCase() === "GET";
}

function normalizeFeatureName(feature: string): { pascal: string; upperOperation: string } {
    const pascal = toPascalCase(feature);
    return { pascal, upperOperation: pascal };
}

function inferOperationToken(method: ContractMethod, featurePascal: string): string {
    const http = String(method.http || "").toUpperCase();
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
    const handlerIface = isQ ? "IQueryHandler" : "ICommandHandler";
    const marker = isQ ? "IQuery" : "ICommand";

    const responseName = method.response?.name || `${featurePascal}Response`;
    const requestName = method.request?.name || `${operation}${featurePascal}Request`;
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

function buildHandler(method: ContractMethod, featurePascal: string, operation: string, moduleName: string, featureSegment: string): { typeName: string; content: string } {
    const isQ = isQuery(method);
    const suffix = isQ ? "Query" : "Command";
    const handlerIface = isQ ? "IQueryHandler" : "ICommandHandler";
    const marker = isQ ? "Query" : "Command";
    const responseName = method.response?.name || `${featurePascal}Response`;
    const responseFields = method.response?.fields || {};
    const requestFields = method.request?.fields || {};
    const typeName = `${operation}${featurePascal}${suffix}`;

    const lines: string[] = [];
    lines.push(`using Cortex.Mediator.${marker === "Query" ? "Queries" : "Commands"};`);
    lines.push(`using NitroGroups.Shared.Contracts;`);
    lines.push(``);
    lines.push(`namespace NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation};`);
    lines.push(``);
    lines.push(`public class ${typeName}Handler : ${handlerIface}<${typeName}, Result<${responseName}>>`);
    lines.push(`{`);
    const handlerParam = isQ ? "request" : "command";
    lines.push(`    public Task<Result<${responseName}>> Handle(${typeName} ${handlerParam}, CancellationToken cancellationToken)`);
    lines.push(`    {`);
    lines.push(`        // TODO: Implementación mínima determinista. Ajustar con lógica de dominio real.`);
    lines.push(`        var response = new ${responseName}`);
    lines.push(`        {`);
    for (const [field, meta] of Object.entries(responseFields)) {
        lines.push(`            ${toPascalCase(field)} = ${mapDefaultCs(meta)},`);
    }
    if (Object.keys(responseFields).length === 0) {
        // Struct vacío — nada que hacer
    }
    lines.push(`        };`);
    lines.push(`        return Task.FromResult(Result<${responseName}>.Success(response));`);
    lines.push(`    }`);
    lines.push(`}`);
    return { typeName: `${typeName}Handler`, content: lines.join("\n") };
}

function buildEndpoint(method: ContractMethod, contract: B2BContract, featurePascal: string, operation: string, moduleName: string, featureSegment: string, queryOrCommandName: string): { typeName: string; content: string } {
    const http = String(method.http || "GET").toUpperCase();
    const mapMethod = `Map${http.charAt(0)}${http.slice(1).toLowerCase()}`;
    const responseName = method.response?.name || `${featurePascal}Response`;
    const isQ = isQuery(method);
    const requestFields = method.request?.fields || {};
    const marker = isQ ? "Query" : "Command";
    const sendFn = isQ ? "SendQueryAsync" : "SendCommandAsync";

    const parameterList: string[] = [];
    const constructorArgs: string[] = [];
    for (const [field, meta] of Object.entries(requestFields)) {
        const csType = mapTypeToCSharp(meta);
        const pascal = toPascalCase(field);
        const camel = field.charAt(0).toLowerCase() + field.slice(1);
        const attr = http === "GET" ? "[FromQuery] " : "[FromBody] ";
        parameterList.push(`${attr}${csType} ${camel}`);
        constructorArgs.push(camel);
    }
    parameterList.push("IMediator mediator");

    const endpointPath = contract.endpoint.startsWith("/") ? contract.endpoint.slice(1) : contract.endpoint;

    const lines: string[] = [];
    lines.push(`using Cortex.Mediator;`);
    lines.push(`using Microsoft.AspNetCore.Builder;`);
    lines.push(`using Microsoft.AspNetCore.Http;`);
    lines.push(`using Microsoft.AspNetCore.Routing;`);
    lines.push(`using Microsoft.AspNetCore.Mvc;`);
    lines.push(`using NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation};`);
    lines.push(`using NitroGroups.Shared.EndpointMapping;`);
    lines.push(`using NitroGroups.Shared.Contracts;`);
    lines.push(``);
    lines.push(`namespace NitroGroups.Core.${moduleName}.Infrastructure.Endpoints.${featureSegment};`);
    lines.push(``);
    lines.push(`public class ${operation} : IEndpoint`);
    lines.push(`{`);
    lines.push(`    public void MapEndpoint(IEndpointRouteBuilder app)`);
    lines.push(`    {`);
    lines.push(`        app.${mapMethod}("${endpointPath}", async (`);
    lines.push(`            ${parameterList.join(",\n            ")}) =>`);
    lines.push(`        {`);
    const ctorArgs = constructorArgs.length > 0 ? constructorArgs.join(", ") : "";
    lines.push(`            var ${marker.toLowerCase()} = new ${queryOrCommandName}(${ctorArgs});`);
    lines.push(`            var result = await mediator.${sendFn}<${queryOrCommandName}, Result<${responseName}>>(${marker.toLowerCase()});`);
    lines.push(`            return result.IsFailure ? Results.BadRequest(result.Error) : Results.Ok(result.Value);`);
    lines.push(`        })`);
    lines.push(`        .WithTags("${featurePascal}");`);
    lines.push(`    }`);
    lines.push(`}`);
    return { typeName: operation, content: lines.join("\n") };
}

function buildDtoFile(dto: ContractDto, moduleName: string, featureSegment: string, operation: string): FileOutput {
    // DTOs conviven en el mismo folder/namespace que Query/Handler/Endpoint de la operación,
    // garantizando compilación sin `using` adicionales cruzados.
    const content = `namespace NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation};\n\n${buildDtoClass(dto)}\n`;
    return {
        path: `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application/UseCases/${featureSegment}/${operation}/${dto.name}.cs`,
        content
    };
}

/**
 * Construye una implementación backend mínima, compilable y consistente con
 * los vertical slices existentes (`Schedules`). Úsalo cuando la generación IA
 * produzca archivos inválidos o faltantes que el repair-loop no pudo rescatar.
 */
export function buildDeterministicBackend(
    feature: string,
    contract: B2BContract,
    moduleName: string
): FileOutput[] {
    const { pascal: featurePascal } = normalizeFeatureName(feature);
    const featureSegment = featurePascal;
    const files: FileOutput[] = [];

    for (const method of contract.methods || []) {
        const operation = inferOperationToken(method, featurePascal);
        const queryOrCommand = buildCommandOrQuery(method, featurePascal, operation);
        const handler = buildHandler(method, featurePascal, operation, moduleName, featureSegment);
        const endpoint = buildEndpoint(method, contract, featurePascal, operation, moduleName, featureSegment, queryOrCommand.typeName);

        const applicationBase = `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application/UseCases/${featureSegment}/${operation}`;
        const infrastructureBase = `Core/${moduleName}/NitroGroups.Core.${moduleName}.Infrastructure/Endpoints/${featureSegment}`;

        files.push({
            path: `${applicationBase}/${queryOrCommand.typeName}.cs`,
            content: `using Cortex.Mediator.${isQuery(method) ? "Queries" : "Commands"};\nusing NitroGroups.Shared.Contracts;\n\nnamespace NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation};\n\n${queryOrCommand.content}\n`
        });
        files.push({
            path: `${applicationBase}/${handler.typeName}.cs`,
            content: handler.content + "\n"
        });
        files.push({
            path: `${infrastructureBase}/${operation}.cs`,
            content: endpoint.content + "\n"
        });

        if (method.request) {
            files.push(buildDtoFile(method.request, moduleName, featureSegment, operation));
        }
        if (method.response) {
            files.push(buildDtoFile(method.response, moduleName, featureSegment, operation));
        }
    }

    return files;
}
