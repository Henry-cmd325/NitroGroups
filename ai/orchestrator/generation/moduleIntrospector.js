"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRepositoryFor = exports.introspectModule = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function readNamespace(content) {
    const match = content.match(/^\s*namespace\s+([A-Za-z0-9_.]+)\s*(?:;|\{)/m);
    return match ? match[1] : undefined;
}
function introspectModule(moduleName, projectRoot) {
    const appRoot = path_1.default.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Application`);
    const domainRoot = path_1.default.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Domain`);
    if (!fs_1.default.existsSync(appRoot))
        return null;
    const info = {
        moduleName,
        applicationNamespace: `NitroGroups.Core.${moduleName}.Application`,
        applicationAbstractionsNs: `NitroGroups.Core.${moduleName}.Application.Abstractions`,
        domainEntitiesNs: `NitroGroups.Core.${moduleName}.Domain.Entities`,
        repositories: []
    };
    const abstractionsDir = path_1.default.join(appRoot, "Abstractions");
    if (fs_1.default.existsSync(abstractionsDir)) {
        for (const file of fs_1.default.readdirSync(abstractionsDir)) {
            const full = path_1.default.join(abstractionsDir, file);
            if (!file.endsWith(".cs"))
                continue;
            const content = fs_1.default.readFileSync(full, "utf-8");
            const repoMatch = content.match(/public\s+interface\s+(I[A-Za-z0-9_]+Repository)\s*:\s*IGenericRepository<\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_?]+)\s*>/);
            if (repoMatch) {
                const extraMethods = [];
                const methodRegex = /Task<[^>]*>\s+([A-Za-z0-9_]+)\s*\(/g;
                let m;
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
        const infraRoot = path_1.default.join(projectRoot, "Core", moduleName, `NitroGroups.Core.${moduleName}.Infrastructure`);
        const candidates = [
            path_1.default.join(infraRoot, "Repositories", `UnitOfWork${moduleName}.cs`),
            path_1.default.join(infraRoot, "Repositories", `${info.unitOfWork.interfaceName.slice(1)}.cs`)
        ];
        for (const candidate of candidates) {
            if (!fs_1.default.existsSync(candidate))
                continue;
            const uowContent = fs_1.default.readFileSync(candidate, "utf-8");
            for (const repo of info.repositories) {
                const propRegex = new RegExp(`public\\s+${repo.interfaceName}\\s+([A-Za-z0-9_]+)\\s*\\{`);
                const match = uowContent.match(propRegex);
                if (match)
                    repo.uowPropertyName = match[1];
            }
        }
    }
    return info;
}
exports.introspectModule = introspectModule;
/**
 * Busca el repositorio más compatible con la entidad/feature dados.
 * Intenta, en orden:
 *  1. I{EntityName}Repository exactamente.
 *  2. Cualquier repo cuya entityName coincida con la entidad.
 *  3. Cualquier repo cuya interfaceName contenga el feature pascal.
 */
function findRepositoryFor(intro, entityName, featurePascal) {
    const exact = intro.repositories.find(r => r.interfaceName === `I${entityName}Repository`);
    if (exact)
        return exact;
    const byEntity = intro.repositories.find(r => r.entityName === entityName);
    if (byEntity)
        return byEntity;
    const byFeature = intro.repositories.find(r => r.interfaceName.toLowerCase().includes(featurePascal.toLowerCase()));
    return byFeature || null;
}
exports.findRepositoryFor = findRepositoryFor;
