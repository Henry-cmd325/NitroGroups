import fs from "fs";
import path from "path";
import { confirmAction } from "../utils/diffViewer";
import { toPascalCase } from "../orchestrator/types";

export interface CleanFeatureOptions {
    feature: string;
    dryRun: boolean;
    force: boolean;
}

interface PlannedRemoval {
    path: string;
    kind: "folder" | "file";
    reason: string;
}

function simplePluralize(word: string): string {
    const lower = word.toLowerCase();
    if (/(s|x|ch|sh|z)$/.test(lower)) return word + "es";
    if (/y$/i.test(word) && !/[aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
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
function folderMatchesFeature(folderName: string, featurePascal: string): boolean {
    const target = featurePascal.toLowerCase();
    const plural = simplePluralize(featurePascal).toLowerCase();
    const name = folderName;
    const lower = name.toLowerCase();

    if (lower === target || lower === plural) return true;

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

function collectMatchingSubfolders(parentDir: string, featurePascal: string, reasonLabel: string): PlannedRemoval[] {
    const removals: PlannedRemoval[] = [];
    if (!fs.existsSync(parentDir)) return removals;
    for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (!folderMatchesFeature(entry.name, featurePascal)) continue;
        removals.push({
            path: path.join(parentDir, entry.name),
            kind: "folder",
            reason: `${reasonLabel}/${entry.name}`
        });
    }
    return removals;
}

function collectBackendRemovals(featurePascal: string, projectRoot: string): PlannedRemoval[] {
    const removals: PlannedRemoval[] = [];
    const coreDir = path.join(projectRoot, "Core");
    if (!fs.existsSync(coreDir)) return removals;

    for (const module of fs.readdirSync(coreDir)) {
        const appRoot = path.join(coreDir, module, `NitroGroups.Core.${module}.Application`);
        const infraRoot = path.join(coreDir, module, `NitroGroups.Core.${module}.Infrastructure`);

        // UseCases/<match>
        removals.push(...collectMatchingSubfolders(
            path.join(appRoot, "UseCases"), featurePascal,
            `UseCases del módulo ${module}`
        ));

        // Endpoints/<match>
        removals.push(...collectMatchingSubfolders(
            path.join(infraRoot, "Endpoints"), featurePascal,
            `Endpoints del módulo ${module}`
        ));

        // Core/<feature>/ huérfano (phantom módulo dejado por runs previos)
        if (module.toLowerCase() === featurePascal.toLowerCase()) {
            const phantom = path.join(coreDir, module);
            const hasProjects = fs.readdirSync(phantom).some(e =>
                e.endsWith(".csproj") || e.startsWith("NitroGroups.Core.")
            );
            if (!hasProjects) {
                removals.push({ path: phantom, kind: "folder", reason: `Directorio Core/${module}/ huérfano (sin .csproj).` });
            }
        }
    }
    return removals;
}

function collectFrontendRemovals(feature: string, featurePascal: string, projectRoot: string): PlannedRemoval[] {
    const removals: PlannedRemoval[] = [];
    const uiRoot = path.join(projectRoot, "UI", "nitro-groups", "src");
    if (!fs.existsSync(uiRoot)) return removals;

    const featureDir = path.join(uiRoot, "features", feature);
    if (fs.existsSync(featureDir)) {
        removals.push({ path: featureDir, kind: "folder", reason: `features/${feature} (tipos, service, hook, componente).` });
    }

    const pageDir = path.join(uiRoot, "app", feature.toLowerCase());
    if (fs.existsSync(pageDir)) {
        removals.push({ path: pageDir, kind: "folder", reason: `Ruta Next.js /app/${feature.toLowerCase()}/.` });
    }

    return removals;
}

function collectContractRemoval(feature: string, projectRoot: string): PlannedRemoval[] {
    const contractPath = path.join(projectRoot, "ai", "contracts", "b2b", `${feature}.contract.json`);
    return fs.existsSync(contractPath)
        ? [{ path: contractPath, kind: "file", reason: "Contrato B2B." }]
        : [];
}

export async function cleanFeature(options: CleanFeatureOptions): Promise<void> {
    const { feature, dryRun, force } = options;
    const featurePascal = toPascalCase(feature);
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
        const rel = path.relative(projectRoot, item.path);
        console.log(`   ${item.kind === "folder" ? "📁" : "📄"} ${rel}`);
        console.log(`      → ${item.reason}`);
    }

    if (dryRun) {
        console.log(`\n--dry-run activo. No se borra nada.`);
        return;
    }

    if (!force) {
        const proceed = await confirmAction(`\n⚠️  Esta operación es destructiva. ¿Continuar?`);
        if (!proceed) {
            console.log(`❌ Operación abortada.`);
            return;
        }
    }

    for (const item of plan) {
        try {
            if (item.kind === "folder") {
                fs.rmSync(item.path, { recursive: true, force: true });
            } else {
                fs.unlinkSync(item.path);
            }
            console.log(`   ✔️ Eliminado ${path.relative(projectRoot, item.path)}`);
        } catch (error: any) {
            console.warn(`   ⚠️  No se pudo eliminar ${item.path}: ${error?.message}`);
        }
    }

    console.log(`\n✅ clean-feature completado.`);
}
