"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRealHandler = exports.buildFieldMappings = exports.classifyOperation = void 0;
const types_1 = require("../types");
/**
 * Clasifica la operación derivada del contrato en un "verbo" soportado por el
 * generador de handlers reales. Si cae en "unsupported", el caller debe usar el
 * stub determinista tradicional y dejar un TODO.
 */
function classifyOperation(method) {
    const http = String(method.http || "").toUpperCase();
    const name = (method.name || "").toLowerCase();
    if (http === "GET") {
        const hasIdInRequest = method.request && Object.keys(method.request.fields || {}).some(f => f.toLowerCase() === "id");
        if (name.startsWith("list") || name.startsWith("getall") || !hasIdInRequest)
            return "list";
        return "get-by-id";
    }
    if (http === "POST")
        return "create";
    if (http === "PUT" || http === "PATCH")
        return "update";
    if (http === "DELETE")
        return "delete";
    return "unsupported";
}
exports.classifyOperation = classifyOperation;
function buildFieldMappings(dto, entity) {
    const byName = new Map(entity.properties.map(p => [p.name.toLowerCase(), p]));
    return Object.entries(dto.fields || {}).map(([field, meta]) => {
        const pascal = (0, types_1.toPascalCase)(field);
        return {
            dtoField: field,
            dtoPascal: pascal,
            entityProperty: byName.get(pascal.toLowerCase()),
            meta
        };
    });
}
exports.buildFieldMappings = buildFieldMappings;
function assignmentForField(mapping, entityVar) {
    if (!mapping.entityProperty) {
        // Campo del contrato que no existe en la entidad: se deja default; TODO para el dev.
        return `            ${mapping.dtoPascal} = default, // TODO: campo '${mapping.dtoField}' no existe en la entidad`;
    }
    const entityProp = mapping.entityProperty;
    const source = `${entityVar}.${entityProp.name}`;
    const nullable = entityProp.nullable;
    const contractFormat = (mapping.meta.format || "").toLowerCase();
    const contractType = (mapping.meta.type || "").toLowerCase();
    // Cuando la propiedad de la entidad es nullable, el DTO en este generador
    // también emite el tipo como nullable (`buildDtoClassFromMappings`), así
    // que el assignment directo es seguro y no fuerza coerción.
    if (entityProp.csType === "DateTimeOffset" && contractFormat === "iso-date") {
        return `            ${mapping.dtoPascal} = ${source},`;
    }
    if (entityProp.csType === "DateTime" && contractFormat === "iso-date") {
        return `            ${mapping.dtoPascal} = ${source},`;
    }
    if (entityProp.csType === "long" && contractFormat === "int") {
        const cast = nullable ? `(int?)${source}` : `(int)${source}`;
        return `            ${mapping.dtoPascal} = ${cast},`;
    }
    if (/^(int|long|short|decimal|double|float|bool|Guid|string)$/.test(entityProp.csType) ||
        contractType === "string" || contractType === "number" || contractType === "boolean") {
        return `            ${mapping.dtoPascal} = ${source},`;
    }
    // Enum → string (aunque sea nullable, ToString sobre null de value-type enum
    // no aplica; para tipos ref use ?. ).
    return `            ${mapping.dtoPascal} = ${source}${nullable ? "?" : ""}.ToString(),`;
}
function chooseRepoAccess(options) {
    const { moduleIntro, repo } = options;
    const extraUsings = [];
    // Si hay UoW y expone la propiedad, preferimos UoW (consistente con el resto del módulo).
    if (moduleIntro.unitOfWork && repo.uowPropertyName) {
        if (moduleIntro.unitOfWork.namespace)
            extraUsings.push(`using ${moduleIntro.unitOfWork.namespace};`);
        return {
            fieldName: "unitOfWork",
            injection: `${moduleIntro.unitOfWork.interfaceName} unitOfWork`,
            constructorBody: "",
            repoExpression: `unitOfWork.${repo.uowPropertyName}`,
            extraUsings,
            needsUow: true
        };
    }
    // Fallback: inyectar el repo directo.
    if (repo.namespace)
        extraUsings.push(`using ${repo.namespace};`);
    const camelRepo = repo.interfaceName.charAt(1).toLowerCase() + repo.interfaceName.slice(2);
    return {
        fieldName: camelRepo,
        injection: `${repo.interfaceName} ${camelRepo}`,
        constructorBody: "",
        repoExpression: camelRepo,
        extraUsings,
        needsUow: false
    };
}
function buildRealHandler(options) {
    const { method, featurePascal, featureSegment, operation, moduleName, entity, contract } = options;
    const op = classifyOperation(method);
    const typeName = `${operation}${featurePascal}${method.http.toUpperCase() === "GET" ? "Query" : "Command"}`;
    const handlerName = `${typeName}Handler`;
    const responseName = method.response?.name || `${featurePascal}Response`;
    const isQ = method.http.toUpperCase() === "GET";
    const markerIface = isQ ? "IQueryHandler" : "ICommandHandler";
    const responseDto = method.response || { name: responseName, fields: {} };
    const mappings = buildFieldMappings(responseDto, entity);
    const access = chooseRepoAccess(options);
    const usings = new Set([
        `using Cortex.Mediator.${isQ ? "Queries" : "Commands"};`,
        `using NitroGroups.Shared.Contracts;`,
        `using ${options.moduleIntro.domainEntitiesNs};`,
    ]);
    if (!access.needsUow) {
        usings.add(`using ${options.moduleIntro.applicationAbstractionsNs};`);
    }
    access.extraUsings.forEach(u => usings.add(u));
    const returnType = op === "list"
        ? `Result<List<${responseName}>>`
        : op === "delete"
            ? `Result<${responseName}>`
            : `Result<${responseName}>`;
    const lines = [];
    Array.from(usings).sort().forEach(u => lines.push(u));
    lines.push("");
    lines.push(`namespace NitroGroups.Core.${moduleName}.Application.UseCases.${featureSegment}.${operation};`);
    lines.push("");
    lines.push(`public class ${handlerName}(${access.injection})`);
    lines.push(`    : ${markerIface}<${typeName}, ${returnType}>`);
    lines.push(`{`);
    const requestParam = isQ ? "request" : "command";
    if (op === "list") {
        lines.push(`    public async Task<${returnType}> Handle(${typeName} ${requestParam}, CancellationToken cancellationToken)`);
        lines.push(`    {`);
        lines.push(`        var entities = await ${access.repoExpression}.GetAllAsync();`);
        lines.push(`        var response = entities.Select(entity => new ${responseName}`);
        lines.push(`        {`);
        mappings.forEach(m => lines.push(assignmentForField(m, "entity")));
        lines.push(`        }).ToList();`);
        lines.push(`        return Result<List<${responseName}>>.Success(response);`);
        lines.push(`    }`);
    }
    else if (op === "get-by-id") {
        lines.push(`    public async Task<${returnType}> Handle(${typeName} ${requestParam}, CancellationToken cancellationToken)`);
        lines.push(`    {`);
        lines.push(`        var entity = await ${access.repoExpression}.GetByIdAsync(${requestParam}.Id);`);
        lines.push(`        if (entity is null) return Result<${responseName}>.Failure("${featurePascal} no encontrado.");`);
        lines.push(`        var response = new ${responseName}`);
        lines.push(`        {`);
        mappings.forEach(m => lines.push(assignmentForField(m, "entity")));
        lines.push(`        };`);
        lines.push(`        return Result<${responseName}>.Success(response);`);
        lines.push(`    }`);
    }
    else if (op === "create") {
        lines.push(`    public async Task<${returnType}> Handle(${typeName} ${requestParam}, CancellationToken cancellationToken)`);
        lines.push(`    {`);
        lines.push(`        // TODO: construir la entidad con los campos del request. Rellenamos los conocidos.`);
        lines.push(`        var entity = new ${entity.entityName}`);
        lines.push(`        {`);
        Object.keys(method.request?.fields || {}).forEach(field => {
            const pascal = (0, types_1.toPascalCase)(field);
            const hasOnEntity = entity.properties.some(p => p.name === pascal);
            if (hasOnEntity)
                lines.push(`            ${pascal} = ${requestParam}.${pascal},`);
        });
        lines.push(`        };`);
        lines.push(`        await ${access.repoExpression}.CreateAsync(entity);`);
        if (access.needsUow)
            lines.push(`        await unitOfWork.SaveChangesAsync(cancellationToken);`);
        else
            lines.push(`        // TODO: commit unit-of-work aquí si aplica.`);
        lines.push(`        var response = new ${responseName}`);
        lines.push(`        {`);
        mappings.forEach(m => lines.push(assignmentForField(m, "entity")));
        lines.push(`        };`);
        lines.push(`        return Result<${responseName}>.Success(response);`);
        lines.push(`    }`);
    }
    else if (op === "update") {
        lines.push(`    public async Task<${returnType}> Handle(${typeName} ${requestParam}, CancellationToken cancellationToken)`);
        lines.push(`    {`);
        lines.push(`        var entity = await ${access.repoExpression}.GetByIdAsync(${requestParam}.Id);`);
        lines.push(`        if (entity is null) return Result<${responseName}>.Failure("${featurePascal} no encontrado.");`);
        Object.keys(method.request?.fields || {}).forEach(field => {
            const pascal = (0, types_1.toPascalCase)(field);
            if (pascal === "Id")
                return;
            const hasOnEntity = entity.properties.some(p => p.name === pascal);
            if (hasOnEntity)
                lines.push(`        entity.${pascal} = ${requestParam}.${pascal};`);
        });
        lines.push(`        ${access.repoExpression}.Update(entity);`);
        if (access.needsUow)
            lines.push(`        await unitOfWork.SaveChangesAsync(cancellationToken);`);
        else
            lines.push(`        // TODO: commit unit-of-work aquí si aplica.`);
        lines.push(`        var response = new ${responseName}`);
        lines.push(`        {`);
        mappings.forEach(m => lines.push(assignmentForField(m, "entity")));
        lines.push(`        };`);
        lines.push(`        return Result<${responseName}>.Success(response);`);
        lines.push(`    }`);
    }
    else if (op === "delete") {
        lines.push(`    public async Task<${returnType}> Handle(${typeName} ${requestParam}, CancellationToken cancellationToken)`);
        lines.push(`    {`);
        lines.push(`        var entity = await ${access.repoExpression}.GetByIdAsync(${requestParam}.Id);`);
        lines.push(`        if (entity is null) return Result<${responseName}>.Failure("${featurePascal} no encontrado.");`);
        lines.push(`        ${access.repoExpression}.Delete(entity);`);
        if (access.needsUow)
            lines.push(`        await unitOfWork.SaveChangesAsync(cancellationToken);`);
        else
            lines.push(`        // TODO: commit unit-of-work aquí si aplica.`);
        lines.push(`        return Result<${responseName}>.Success(new ${responseName} { Success = true });`);
        lines.push(`    }`);
    }
    else {
        // Fallback, no debería entrar por el guardia del caller.
        lines.push(`    public Task<${returnType}> Handle(${typeName} ${requestParam}, CancellationToken cancellationToken)`);
        lines.push(`    {`);
        lines.push(`        // TODO: operación no soportada por el bootstrap determinista.`);
        lines.push(`        return Task.FromResult(Result<${responseName}>.Failure("Not implemented"));`);
        lines.push(`    }`);
    }
    lines.push(`}`);
    const applicationBase = `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application/UseCases/${featureSegment}/${operation}`;
    return { path: `${applicationBase}/${handlerName}.cs`, content: lines.join("\n") + "\n" };
}
exports.buildRealHandler = buildRealHandler;
