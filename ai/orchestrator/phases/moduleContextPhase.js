"use strict";
/**
 * Fase — Resolución de módulo backend y contexto de dominio.
 *
 * Determina `moduleName` y `domainContext` a partir de `resolveDomainContext`,
 * con fallback por módulos registrados en `Program.cs` cuando el nombre
 * derivado no coincide con un `Add{Module}Module`.
 *
 * Opcionalmente valida que existan los proyectos Application/Infrastructure
 * y que el módulo esté registrado en el API host (*solo* si
 * `enforceBackendModule` es true).
 *
 * Ver refactor v1.2 — Sesión 2.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceBackendModuleOrReport = exports.validateEnforcedBackendModule = exports.runModuleContextPhase = exports.extractDomainContextFromModule = exports.getRegisteredModulesFromProgram = exports.buildModuleName = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const contextExtractor_1 = require("../../utils/contextExtractor");
const modes_1 = require("../pipeline/modes");
function buildModuleName(feature) {
    return feature.charAt(0).toUpperCase() + feature.slice(1);
}
exports.buildModuleName = buildModuleName;
function getRegisteredModulesFromProgram(projectRoot) {
    const programPath = path_1.default.join(projectRoot, "Services", "NitroGroups.Services.Api", "Program.cs");
    if (!fs_1.default.existsSync(programPath))
        return [];
    const program = fs_1.default.readFileSync(programPath, "utf-8");
    const modules = new Set();
    const regex = /Add([A-Za-z0-9]+)Module/g;
    let match = null;
    while ((match = regex.exec(program)) !== null) {
        modules.add(match[1]);
    }
    return Array.from(modules);
}
exports.getRegisteredModulesFromProgram = getRegisteredModulesFromProgram;
function extractDomainContextFromModule(moduleName, projectRoot) {
    const entityDir = path_1.default.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Domain`, "Entities");
    if (!fs_1.default.existsSync(entityDir))
        return null;
    const files = fs_1.default.readdirSync(entityDir).filter(file => file.endsWith(".cs"));
    if (files.length === 0)
        return null;
    let allContext = "";
    for (const file of files) {
        const content = fs_1.default.readFileSync(path_1.default.join(entityDir, file), "utf-8");
        const extracted = content
            .split("\n")
            .filter(line => (line.includes("public") && (line.includes("{ get; set; }") || line.includes("("))) &&
            !line.includes("class") && !line.includes("namespace"));
        allContext += `ENTITY: ${file}\n${extracted.map(line => line.trim()).join("\n")}\n\n`;
    }
    return allContext.trim() || null;
}
exports.extractDomainContextFromModule = extractDomainContextFromModule;
/**
 * Resuelve módulo + contexto. No falla por sí sola: devuelve el mejor
 * esfuerzo; la validación estricta es `validateEnforcedBackendModule`.
 */
function runModuleContextPhase(feature, projectRoot) {
    const domainResolution = (0, contextExtractor_1.resolveDomainContext)(feature);
    let moduleName = domainResolution?.moduleName || buildModuleName(feature);
    let domainContext = domainResolution?.context || (0, contextExtractor_1.extractDomainContext)(feature);
    const registeredModules = getRegisteredModulesFromProgram(projectRoot);
    if (registeredModules.length > 0 && !registeredModules.includes(moduleName)) {
        const normalizedFeature = feature.toLowerCase();
        const fallbackModule = registeredModules.find(candidate => {
            const context = extractDomainContextFromModule(candidate, projectRoot);
            return context?.toLowerCase().includes(normalizedFeature);
        });
        if (fallbackModule) {
            moduleName = fallbackModule;
            domainContext = extractDomainContextFromModule(fallbackModule, projectRoot);
        }
    }
    return { moduleName, domainContext };
}
exports.runModuleContextPhase = runModuleContextPhase;
/**
 * Requiere proyectos Application/Infrastructure y, si `Program.cs` existe,
 * presencia de `Add{Module}Module`.
 */
function validateEnforcedBackendModule(moduleName, projectRoot) {
    const expectedApplicationProject = path_1.default.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Application`);
    const expectedInfrastructureProject = path_1.default.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Infrastructure`);
    if (!fs_1.default.existsSync(expectedApplicationProject) || !fs_1.default.existsSync(expectedInfrastructureProject)) {
        return { ok: false, code: "missing_core_projects" };
    }
    const apiProgramPath = path_1.default.join(projectRoot, "Services", "NitroGroups.Services.Api", "Program.cs");
    if (fs_1.default.existsSync(apiProgramPath)) {
        const programContent = fs_1.default.readFileSync(apiProgramPath, "utf-8");
        if (!programContent.includes(`Add${moduleName}Module`)) {
            return { ok: false, code: "not_registered_in_api_host" };
        }
    }
    return { ok: true };
}
exports.validateEnforcedBackendModule = validateEnforcedBackendModule;
/**
 * Aplica el bloque "enforce backend" del modo. Devuelve `true` si el
 * pipeline puede continuar, `false` si ya se imprimió el error y hay que
 * terminar (equivale a `return` en `generateFeature`).
 */
function enforceBackendModuleOrReport(mode, moduleName, projectRoot) {
    if (!(0, modes_1.getModeConfig)(mode).enforceBackendModule) {
        return true;
    }
    const check = validateEnforcedBackendModule(moduleName, projectRoot);
    if (check.ok) {
        return true;
    }
    if (check.code === "missing_core_projects") {
        console.error(`\n💥 MÓDULO BACKEND NO RESUELTO`);
        console.error(`   No existe un módulo integrado para '${moduleName}' en Core/.`);
        console.error(`   Usa --mode=frontend-only si quieres generar solo UI.\n`);
    }
    else {
        console.error(`\n💥 MÓDULO NO REGISTRADO EN API HOST`);
        console.error(`   Program.cs no llama a Add${moduleName}Module(...).\n`);
    }
    return false;
}
exports.enforceBackendModuleOrReport = enforceBackendModuleOrReport;
