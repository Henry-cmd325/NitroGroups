import fs from "fs";
import path from "path";

export interface ModuleRepositoryInfo {
    /** Nombre completo de la interfaz, ej: "IGroupAvailabilityRepository". */
    interfaceName: string;
    /** Entidad tipada que el repo cubre, ej: "GroupAvailability". */
    entityName: string;
    /** Llave del id, típicamente "long". */
    keyType: string;
    /** Si el repo expone métodos adicionales (no genéricos), los listamos. */
    extraMethods: string[];
    /** Path al .cs donde vive la interfaz. */
    path: string;
    /** Si el UoW del módulo expone este repo como propiedad, guardamos el nombre de la propiedad. */
    uowPropertyName?: string;
    /** Namespace donde vive la interfaz (para usings). */
    namespace?: string;
}

export interface ModuleUnitOfWorkInfo {
    interfaceName: string;   // ej: "IUnitOfWorkSchedules"
    namespace?: string;
    path: string;
}

export interface ModuleIntrospection {
    moduleName: string;                      // ej: "Schedules"
    applicationNamespace: string;            // ej: "NitroGroups.Core.Schedules.Application"
    applicationAbstractionsNs: string;       // ej: "NitroGroups.Core.Schedules.Application.Abstractions"
    domainEntitiesNs: string;                // ej: "NitroGroups.Core.Schedules.Domain.Entities"
    repositories: ModuleRepositoryInfo[];
    unitOfWork?: ModuleUnitOfWorkInfo;
}

function readNamespace(content: string): string | undefined {
    const match = content.match(/^\s*namespace\s+([A-Za-z0-9_.]+)\s*(?:;|\{)/m);
    return match ? match[1] : undefined;
}

export function introspectModule(moduleName: string, projectRoot: string): ModuleIntrospection | null {
    const appRoot = path.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Application`);
    const domainRoot = path.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Domain`);

    if (!fs.existsSync(appRoot)) return null;

    const info: ModuleIntrospection = {
        moduleName,
        applicationNamespace: `NitroGroups.Core.${moduleName}.Application`,
        applicationAbstractionsNs: `NitroGroups.Core.${moduleName}.Application.Abstractions`,
        domainEntitiesNs: `NitroGroups.Core.${moduleName}.Domain.Entities`,
        repositories: []
    };

    const abstractionsDir = path.join(appRoot, "Abstractions");
    if (fs.existsSync(abstractionsDir)) {
        for (const file of fs.readdirSync(abstractionsDir)) {
            const full = path.join(abstractionsDir, file);
            if (!file.endsWith(".cs")) continue;
            const content = fs.readFileSync(full, "utf-8");

            const repoMatch = content.match(/public\s+interface\s+(I[A-Za-z0-9_]+Repository)\s*:\s*IGenericRepository<\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_?]+)\s*>/);
            if (repoMatch) {
                const extraMethods: string[] = [];
                const methodRegex = /Task<[^>]*>\s+([A-Za-z0-9_]+)\s*\(/g;
                let m: RegExpExecArray | null;
                while ((m = methodRegex.exec(content)) !== null) {
                    extraMethods.push(m[1]);
                }
                info.repositories.push({
                    interfaceName: repoMatch[1],
                    entityName: repoMatch[2],
                    keyType: repoMatch[3],
                    extraMethods,
                    path: full,
                    namespace: readNamespace(content)
                });
                continue;
            }

            const uowMatch = content.match(/public\s+interface\s+(IUnitOfWork[A-Za-z0-9_]+)/);
            if (uowMatch) {
                info.unitOfWork = {
                    interfaceName: uowMatch[1],
                    namespace: readNamespace(content),
                    path: full
                };
            }
        }
    }

    // Buscar las propiedades del UoW para saber cómo se nombran los repos dentro
    if (info.unitOfWork) {
        const infraRoot = path.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Infrastructure`);
        const candidates = [
            path.join(infraRoot, "Repositories", `UnitOfWork${moduleName}.cs`),
            path.join(infraRoot, "Repositories", `${info.unitOfWork.interfaceName.slice(1)}.cs`)
        ];
        for (const candidate of candidates) {
            if (!fs.existsSync(candidate)) continue;
            const uowContent = fs.readFileSync(candidate, "utf-8");
            for (const repo of info.repositories) {
                const propRegex = new RegExp(`public\\s+${repo.interfaceName}\\s+([A-Za-z0-9_]+)\\s*\\{`);
                const match = uowContent.match(propRegex);
                if (match) repo.uowPropertyName = match[1];
            }
        }
    }

    return info;
}

/**
 * Busca el repositorio más compatible con la entidad/feature dados.
 * Intenta, en orden:
 *  1. I{EntityName}Repository exactamente.
 *  2. Cualquier repo cuya entityName coincida con la entidad.
 *  3. Cualquier repo cuya interfaceName contenga el feature pascal.
 */
export function findRepositoryFor(
    intro: ModuleIntrospection,
    entityName: string,
    featurePascal: string
): ModuleRepositoryInfo | null {
    const exact = intro.repositories.find(r => r.interfaceName === `I${entityName}Repository`);
    if (exact) return exact;

    const byEntity = intro.repositories.find(r => r.entityName === entityName);
    if (byEntity) return byEntity;

    const byFeature = intro.repositories.find(r =>
        r.interfaceName.toLowerCase().includes(featurePascal.toLowerCase())
    );
    return byFeature || null;
}
