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

import fs from "fs";
import path from "path";

import { extractDomainContext, resolveDomainContext } from "../../utils/contextExtractor";
import { getModeConfig } from "../pipeline/modes";
import type { OrchestratorMode } from "../types";

export function buildModuleName(feature: string): string {
    return feature.charAt(0).toUpperCase() + feature.slice(1);
}

export function getRegisteredModulesFromProgram(projectRoot: string): string[] {
    const programPath = path.join(projectRoot, "Services", "NitroGroups.Services.Api", "Program.cs");
    if (!fs.existsSync(programPath)) return [];

    const program = fs.readFileSync(programPath, "utf-8");
    const modules = new Set<string>();
    const regex = /Add([A-Za-z0-9]+)Module/g;
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(program)) !== null) {
        modules.add(match[1]);
    }
    return Array.from(modules);
}

export function extractDomainContextFromModule(moduleName: string, projectRoot: string): string | null {
    const entityDir = path.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Domain`, "Entities");
    if (!fs.existsSync(entityDir)) return null;

    const files = fs.readdirSync(entityDir).filter(file => file.endsWith(".cs"));
    if (files.length === 0) return null;

    let allContext = "";
    for (const file of files) {
        const content = fs.readFileSync(path.join(entityDir, file), "utf-8");
        const extracted = content
            .split("\n")
            .filter(line =>
                (line.includes("public") && (line.includes("{ get; set; }") || line.includes("("))) &&
                !line.includes("class") && !line.includes("namespace")
            );
        allContext += `ENTITY: ${file}\n${extracted.map(line => line.trim()).join("\n")}\n\n`;
    }

    return allContext.trim() || null;
}

export interface ModuleContextPhaseResult {
    moduleName: string;
    /** Texto de propiedades de entidades agregado; null si no hay módulo/entidades. */
    domainContext: string | null;
}

/**
 * Resuelve módulo + contexto. No falla por sí sola: devuelve el mejor
 * esfuerzo; la validación estricta es `validateEnforcedBackendModule`.
 */
export function runModuleContextPhase(
    feature: string,
    projectRoot: string
): ModuleContextPhaseResult {
    const domainResolution = resolveDomainContext(feature);
    let moduleName = domainResolution?.moduleName || buildModuleName(feature);
    let domainContext = domainResolution?.context || extractDomainContext(feature);

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

export type EnforcedModuleFailure =
    | { ok: false; code: "missing_core_projects" }
    | { ok: false; code: "not_registered_in_api_host" };

/**
 * Requiere proyectos Application/Infrastructure y, si `Program.cs` existe,
 * presencia de `Add{Module}Module`.
 */
export function validateEnforcedBackendModule(
    moduleName: string,
    projectRoot: string
): { ok: true } | EnforcedModuleFailure {
    const expectedApplicationProject = path.join(
        projectRoot,
        "Core",
        moduleName,
        `NitroGroups.Core.${moduleName}.Application`
    );
    const expectedInfrastructureProject = path.join(
        projectRoot,
        "Core",
        moduleName,
        `NitroGroups.Core.${moduleName}.Infrastructure`
    );

    if (!fs.existsSync(expectedApplicationProject) || !fs.existsSync(expectedInfrastructureProject)) {
        return { ok: false, code: "missing_core_projects" };
    }

    const apiProgramPath = path.join(projectRoot, "Services", "NitroGroups.Services.Api", "Program.cs");
    if (fs.existsSync(apiProgramPath)) {
        const programContent = fs.readFileSync(apiProgramPath, "utf-8");
        if (!programContent.includes(`Add${moduleName}Module`)) {
            return { ok: false, code: "not_registered_in_api_host" };
        }
    }

    return { ok: true };
}

/**
 * Aplica el bloque "enforce backend" del modo. Devuelve `true` si el
 * pipeline puede continuar, `false` si ya se imprimió el error y hay que
 * terminar (equivale a `return` en `generateFeature`).
 */
export function enforceBackendModuleOrReport(
    mode: OrchestratorMode,
    moduleName: string,
    projectRoot: string
): boolean {
    if (!getModeConfig(mode).enforceBackendModule) {
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
    } else {
        console.error(`\n💥 MÓDULO NO REGISTRADO EN API HOST`);
        console.error(`   Program.cs no llama a Add${moduleName}Module(...).\n`);
    }

    return false;
}
