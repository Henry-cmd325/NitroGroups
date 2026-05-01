/**
 * Reconciliación de archivos generados ↔ archivos en disco.
 *
 * Problema que resuelve:
 * Durante el pipeline el LLM puede escribir archivos en rutas A/B/C y luego
 * el fallback determinista los reemplaza con archivos en rutas D/E/F. Si el
 * pipeline solo escribe D/E/F sin tocar A/B/C, estos últimos quedan
 * huérfanos en disco (por ejemplo: un `ListHandler.cs` del LLM que queda al
 * lado del `Get/GetHandler.cs` correcto del fallback). Con el tiempo eso
 * produce build rot y archivos confusos en el repo.
 *
 * Estrategia:
 * 1) Calculamos las carpetas "propias" de la feature (scopes):
 *    - `Core/<Module>/**.Application/UseCases/<FeaturePascal>/`
 *    - `Core/<Module>/**.Infrastructure/Endpoints/<FeaturePascal>/`
 *    - `UI/nitro-groups/src/features/<feature>/`
 * 2) Listamos los .cs/.ts/.tsx bajo esos scopes.
 * 3) Los que no están en el set final `targetFiles` son huérfanos.
 * 4) Los borramos ANTES de escribir el set final y los registramos, para que
 *    el rollback pueda restaurarlos si el quality gate final falla.
 *
 * El reconciliador NUNCA toca:
 *  - Entidades de dominio (Core/<Module>/**.Domain/Entities/)
 *  - Rutas `src/app/<feature>/page.tsx` que existían previamente (wire-in
 *    ya las respeta por su cuenta).
 *  - Cualquier archivo fuera de los scopes declarados.
 */

import fs from "fs";
import path from "path";
import { FileOutput, toPascalCase, normalizeToPosix } from "../types";

export interface ReconcilePlan {
    orphans: string[];          // rutas absolutas a borrar
    scopes: string[];           // rutas absolutas de carpetas escaneadas
}

export interface ReconcileOptions {
    feature: string;
    moduleName: string | null;
    projectRoot: string;
    targetFiles: FileOutput[];
    /** Extensiones que consideramos generadas por el orquestador. */
    extensions?: string[];
}

const DEFAULT_EXTENSIONS = [".cs", ".ts", ".tsx"];

function walkFiles(rootDir: string, extensions: string[]): string[] {
    if (!fs.existsSync(rootDir)) return [];
    const results: string[] = [];
    const stack: string[] = [rootDir];
    while (stack.length > 0) {
        const current = stack.pop()!;
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(full);
                continue;
            }
            if (!entry.isFile()) continue;
            if (extensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
                results.push(full);
            }
        }
    }
    return results;
}

function absoluteScope(projectRoot: string, relative: string): string {
    return path.resolve(projectRoot, relative);
}

export function computeScopes(options: Pick<ReconcileOptions, "feature" | "moduleName" | "projectRoot">): string[] {
    const { feature, moduleName, projectRoot } = options;
    const featurePascal = toPascalCase(feature);
    const scopes: string[] = [];

    if (moduleName) {
        const moduleCore = path.join(projectRoot, "Core", moduleName);
        if (fs.existsSync(moduleCore)) {
            const appRoot = path.join(moduleCore, `NitroGroups.Core.${moduleName}.Application`);
            const infraRoot = path.join(moduleCore, `NitroGroups.Core.${moduleName}.Infrastructure`);
            scopes.push(path.join(appRoot, "UseCases", featurePascal));
            scopes.push(path.join(infraRoot, "Endpoints", featurePascal));
        }
    }

    scopes.push(absoluteScope(projectRoot, `UI/nitro-groups/src/features/${feature}`));
    return scopes.filter(s => !!s);
}

export function planReconciliation(options: ReconcileOptions): ReconcilePlan {
    const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
    const scopes = computeScopes(options);

    // Normalizamos las rutas del set final a absolutas para compararlas.
    const targetAbsolute = new Set(
        options.targetFiles.map(file => {
            const normalized = normalizeToPosix(file.path);
            const abs = path.isAbsolute(normalized)
                ? normalized
                : path.resolve(options.projectRoot, normalized);
            return path.resolve(abs); // normaliza separadores
        })
    );

    const orphans: string[] = [];
    for (const scope of scopes) {
        const onDisk = walkFiles(scope, extensions);
        for (const filePath of onDisk) {
            const resolved = path.resolve(filePath);
            if (!targetAbsolute.has(resolved)) {
                orphans.push(resolved);
            }
        }
    }

    return { orphans, scopes };
}

export interface ReconcileResult {
    orphansDeleted: string[];
    /** Para poder deshacer: path → (null si no existía, o el contenido previo). */
    backup: Map<string, string | null>;
}

/**
 * Ejecuta el plan: borra huérfanos y guarda backup para rollback eventual.
 * El backup incluye el contenido previo de cada huérfano, para poder
 * restaurar si el quality gate final falla.
 */
export function executeReconciliation(plan: ReconcilePlan): ReconcileResult {
    const backup = new Map<string, string | null>();
    const deleted: string[] = [];

    for (const orphan of plan.orphans) {
        try {
            const content = fs.readFileSync(orphan, "utf-8");
            backup.set(orphan, content);
            fs.unlinkSync(orphan);
            deleted.push(orphan);
        } catch {
            // archivo ya no existe o no es legible; lo ignoramos.
        }
    }

    return { orphansDeleted: deleted, backup };
}

/** Restaura huérfanos borrados (invocar solo si hay que revertir). */
export function rollbackReconciliation(result: ReconcileResult): void {
    for (const [filePath, content] of result.backup.entries()) {
        if (content === null) continue;
        try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, content, "utf-8");
        } catch {
            // ignore: mejor dejar logs arriba que fallar el rollback completo.
        }
    }
}
