"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanFeature = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const diffViewer_1 = require("../utils/diffViewer");
const types_1 = require("../orchestrator/types");
function simplePluralize(word) {
    const lower = word.toLowerCase();
    if (/(s|x|ch|sh|z)$/.test(lower))
        return word + "es";
    if (/y$/i.test(word) && !/[aeiou]y$/i.test(word))
        return word.slice(0, -1) + "ies";
    return word + "s";
}
/**
 * Decide si un nombre de carpeta bajo `UseCases/` o `Endpoints/` corresponde
 * a la feature que estamos limpiando. Cubre:
 *  - match exacto (case-insensitive)
 *  - plural simple (`Availability` → `Availabilities`)
 *  - compuestos PascalCase (`GroupAvailability` cuando feature=`Availability`)
 *  - prefijos (`AvailabilityV2` cuando feature=`Availability`)
 *
 * NO matchea nombres totalmente no relacionados; usa límites de palabra en
 * PascalCase para evitar falsos positivos (`UnAvailability` no, `GroupAvailability` sí).
 */
function folderMatchesFeature(folderName, featurePascal) {
    const target = featurePascal.toLowerCase();
    const plural = simplePluralize(featurePascal).toLowerCase();
    const name = folderName;
    const lower = name.toLowerCase();
    if (lower === target || lower === plural)
        return true;
    // prefijo: feature como primer segmento PascalCase
    if (lower.startsWith(target) && (name.length === featurePascal.length || /[A-Z0-9]/.test(name.charAt(featurePascal.length)))) {
        return true;
    }
    // sufijo PascalCase: feature al final precedido por una mayúscula en el
    // carácter justo antes. Ej.: "GroupAvailability" termina en "Availability"
    // y el carácter previo "p" no es mayúscula, pero "G" sí. Revisamos si la
    // feature arranca en un límite de palabra (carácter mayúscula en la posición
    // que la contiene).
    const idx = name.toLowerCase().lastIndexOf(target);
    if (idx > 0 && idx + target.length === name.length) {
        const featureStartCharInOriginal = name.charAt(idx);
        if (featureStartCharInOriginal === featureStartCharInOriginal.toUpperCase()) {
            return true;
        }
    }
    return false;
}
function collectMatchingSubfolders(parentDir, featurePascal, reasonLabel) {
    const removals = [];
    if (!fs_1.default.existsSync(parentDir))
        return removals;
    for (const entry of fs_1.default.readdirSync(parentDir, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        if (!folderMatchesFeature(entry.name, featurePascal))
            continue;
        removals.push({
            path: path_1.default.join(parentDir, entry.name),
            kind: "folder",
            reason: `${reasonLabel}/${entry.name}`
        });
    }
    return removals;
}
function collectBackendRemovals(featurePascal, projectRoot) {
    const removals = [];
    const coreDir = path_1.default.join(projectRoot, "Core");
    if (!fs_1.default.existsSync(coreDir))
        return removals;
    for (const module of fs_1.default.readdirSync(coreDir)) {
        const appRoot = path_1.default.join(coreDir, module, `NitroGroups.Core.${module}.Application`);
        const infraRoot = path_1.default.join(coreDir, module, `NitroGroups.Core.${module}.Infrastructure`);
        // UseCases/<match>
        removals.push(...collectMatchingSubfolders(path_1.default.join(appRoot, "UseCases"), featurePascal, `UseCases del módulo ${module}`));
        // Endpoints/<match>
        removals.push(...collectMatchingSubfolders(path_1.default.join(infraRoot, "Endpoints"), featurePascal, `Endpoints del módulo ${module}`));
        // Core/<feature>/ huérfano (phantom módulo dejado por runs previos)
        if (module.toLowerCase() === featurePascal.toLowerCase()) {
            const phantom = path_1.default.join(coreDir, module);
            const hasProjects = fs_1.default.readdirSync(phantom).some(e => e.endsWith(".csproj") || e.startsWith("NitroGroups.Core."));
            if (!hasProjects) {
                removals.push({ path: phantom, kind: "folder", reason: `Directorio Core/${module}/ huérfano (sin .csproj).` });
            }
        }
    }
    return removals;
}
function collectFrontendRemovals(feature, featurePascal, projectRoot) {
    const removals = [];
    const uiRoot = path_1.default.join(projectRoot, "UI", "nitro-groups", "src");
    if (!fs_1.default.existsSync(uiRoot))
        return removals;
    const featureDir = path_1.default.join(uiRoot, "features", feature);
    if (fs_1.default.existsSync(featureDir)) {
        removals.push({ path: featureDir, kind: "folder", reason: `features/${feature} (tipos, service, hook, componente).` });
    }
    const pageDir = path_1.default.join(uiRoot, "app", feature.toLowerCase());
    if (fs_1.default.existsSync(pageDir)) {
        removals.push({ path: pageDir, kind: "folder", reason: `Ruta Next.js /app/${feature.toLowerCase()}/.` });
    }
    return removals;
}
function collectContractRemoval(feature, projectRoot) {
    const contractPath = path_1.default.join(projectRoot, "ai", "contracts", "b2b", `${feature}.contract.json`);
    return fs_1.default.existsSync(contractPath)
        ? [{ path: contractPath, kind: "file", reason: "Contrato B2B." }]
        : [];
}
async function cleanFeature(options) {
    const { feature, dryRun, force } = options;
    const featurePascal = (0, types_1.toPascalCase)(feature);
    const projectRoot = process.cwd();
    const plan = [
        ...collectBackendRemovals(featurePascal, projectRoot),
        ...collectFrontendRemovals(feature, featurePascal, projectRoot),
        ...collectContractRemoval(feature, projectRoot)
    ];
    console.log(`\n🧹 clean-feature '${feature}' (Pascal='${featurePascal}')`);
    if (plan.length === 0) {
        console.log(`   No hay nada que borrar. La feature parece estar limpia.`);
        return;
    }
    console.log(`\nSe eliminarán los siguientes artefactos:`);
    for (const item of plan) {
        const rel = path_1.default.relative(projectRoot, item.path);
        console.log(`   ${item.kind === "folder" ? "📁" : "📄"} ${rel}`);
        console.log(`      → ${item.reason}`);
    }
    if (dryRun) {
        console.log(`\n--dry-run activo. No se borra nada.`);
        return;
    }
    if (!force) {
        const proceed = await (0, diffViewer_1.confirmAction)(`\n⚠️  Esta operación es destructiva. ¿Continuar?`);
        if (!proceed) {
            console.log(`❌ Operación abortada.`);
            return;
        }
    }
    for (const item of plan) {
        try {
            if (item.kind === "folder") {
                fs_1.default.rmSync(item.path, { recursive: true, force: true });
            }
            else {
                fs_1.default.unlinkSync(item.path);
            }
            console.log(`   ✔️ Eliminado ${path_1.default.relative(projectRoot, item.path)}`);
        }
        catch (error) {
            console.warn(`   ⚠️  No se pudo eliminar ${item.path}: ${error?.message}`);
        }
    }
    console.log(`\n✅ clean-feature completado.`);
}
exports.cleanFeature = cleanFeature;
