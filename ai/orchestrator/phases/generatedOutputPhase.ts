/**
 * Validación de rutas y convenciones sobre `FileOutput[]`, recuperación
 * determinista cuando los issues no son fatales, y filtrado de entidades
 * de dominio protegidas.
 *
 * Extraído de `generateFeature.ts` — refactor v1.2 Sesión 4.
 */

import fs from "fs";
import path from "path";

import { getModeConfig } from "../pipeline/modes";
import { mergeGeneratedFiles } from "../generation/parser";
import { applyDeterministicFrontendFallback } from "../generation/frontendFallback";
import { buildDeterministicBackend } from "../generation/backendFallback";
import type { FileOutput, OrchestratorMode, B2BContract } from "../types";
import { normalizeToPosix, toPascalCase } from "../types";

/** IGenericRepository.GetAllAsync() no admite parámetros; el LLM suele pasar un CancellationToken. */
export function applyBackendLlmGetAllAsyncFix(file: FileOutput): FileOutput {
    if (!file.path.endsWith(".cs") || !file.content.includes("GetAllAsync")) {
        return file;
    }
    const np = normalizeToPosix(file.path);
    if (!np.toLowerCase().includes("core/") || (!/usecases\//i.test(np) && !np.includes("QueryHandler") && !np.includes("CommandHandler"))) {
        return file;
    }
    let c = file.content;
    c = c.replace(/\.GetAllAsync\(\s*([^)]*)\s*\)/g, (full, inside: string) => {
        if (!String(inside).trim()) return full;
        return ".GetAllAsync()";
    });
    return c === file.content ? file : { ...file, content: c };
}

// ═══ Backend: namespaces legítimos por capa ═══
const BACKEND_APP_ALLOWED_NAMESPACES = [
    "Cortex.Mediator",
    "Cortex.Mediator.Commands",
    "Cortex.Mediator.Queries",
    "MediatR",
    "FluentValidation",
    "AutoMapper",
    "NitroGroups.Shared.Contracts",
    "NitroGroups.Shared.Abstractions",
    "System", "System.Threading", "System.Threading.Tasks",
    "System.Collections.Generic", "System.Linq", "System.Linq.Expressions"
];

const BACKEND_INFRA_ALLOWED_NAMESPACES = [
    ...BACKEND_APP_ALLOWED_NAMESPACES,
    "Microsoft.AspNetCore.Builder",
    "Microsoft.AspNetCore.Http",
    "Microsoft.AspNetCore.Routing",
    "Microsoft.AspNetCore.Mvc",
    "Microsoft.EntityFrameworkCore",
    "Microsoft.Extensions.Configuration",
    "Microsoft.Extensions.DependencyInjection",
    "NitroGroups.Shared.Infrastructure",
    "NitroGroups.Shared.EndpointMapping"
];

const BACKEND_DOMAIN_ALLOWED_NAMESPACES = [
    "System", "System.Collections.Generic",
    "NitroGroups.Shared.Domain"
];

function backendAllowedForPath(normalizedPath: string, moduleName: string): string[] {
    const moduleNs = `NitroGroups.Core.${moduleName}`;
    if (normalizedPath.includes(`${moduleName}.Application/`)) {
        return [...BACKEND_APP_ALLOWED_NAMESPACES, moduleNs];
    }
    if (normalizedPath.includes(`${moduleName}.Infrastructure/`)) {
        return [...BACKEND_INFRA_ALLOWED_NAMESPACES, moduleNs];
    }
    if (normalizedPath.includes(`${moduleName}.Domain/`)) {
        return [...BACKEND_DOMAIN_ALLOWED_NAMESPACES, `${moduleNs}.Domain`];
    }
    return [...BACKEND_INFRA_ALLOWED_NAMESPACES, moduleNs];
}

function detectHallucinatedBackendImports(content: string, normalizedPath: string, moduleName: string): string[] {
    const allowed = backendAllowedForPath(normalizedPath, moduleName);
    const offenders = new Set<string>();
    const usingRegex = /^\s*using\s+([A-Za-z_][A-Za-z0-9_.]*)\s*;/gm;
    let match: RegExpExecArray | null;
    while ((match = usingRegex.exec(content)) !== null) {
        const ns = match[1];
        const ok = allowed.some(a => ns === a || ns.startsWith(a + "."));
        if (!ok) offenders.add(ns);
    }
    return Array.from(offenders);
}

const FRONTEND_IMPORT_ALLOWLIST = [
    "@tanstack/react-query",
    "axios",
    "clsx",
    "tailwind-merge",
    "class-variance-authority",
    "lucide-react",
    "react",
    "react-dom",
    "react/jsx-runtime",
    "next",
    "next/link",
    "next/navigation",
    "next/image",
    "next/router"
];

const FRONTEND_ALIAS_ALLOWLIST_EXACT = new Set<string>([
    "@/lib/api-client",
    "@/services/auth.service",
    "@/components/ui/Alert",
    "@/components/ui/Badge",
    "@/components/ui/Button",
    "@/components/ui/Card",
    "@/components/ui/Input",
    "@/components/ui/Loader",
    "@/components/ui/PhoneInput",
    "@/components/ui/ProgressSteps",
    "@/components/ui/TabbedSection"
]);

function detectHallucinatedFrontendImports(content: string): string[] {
    const offenders = new Set<string>();
    const importRegex = /from\s+["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
        const spec = match[1];
        if (spec.startsWith(".") || spec.startsWith("/")) continue;

        if (spec.startsWith("@/")) {
            if (FRONTEND_ALIAS_ALLOWLIST_EXACT.has(spec)) continue;
            const topLevelAllowed = Array.from(FRONTEND_ALIAS_ALLOWLIST_EXACT)
                .some(allowed => spec.startsWith(allowed + "/"));
            if (topLevelAllowed) continue;
            offenders.add(spec);
            continue;
        }

        const parts = spec.split("/");
        const pkg = spec.startsWith("@") ? `${parts[0]}/${parts[1] ?? ""}` : parts[0];
        const allowed = FRONTEND_IMPORT_ALLOWLIST.some(p => p === spec || p === pkg);
        if (!allowed) offenders.add(spec);
    }
    return Array.from(offenders);
}

export type OutputIssueKind =
    | "fatal"
    | "frontend"
    | "backend";

export interface OutputIssue {
    kind: OutputIssueKind;
    message: string;
}

export function validateGeneratedOutput(
    feature: string,
    moduleName: string,
    files: FileOutput[],
    mode: OrchestratorMode
): { isValid: boolean; errors: string[]; issues: OutputIssue[] } {
    const issues: OutputIssue[] = [];
    const featurePrefix = `UI/nitro-groups/src/features/${feature}/`;
    const backendPrefix = `Core/${moduleName}/`;
    const modeConfig = getModeConfig(mode);

    const seen = new Set<string>();
    for (const file of files) {
        const normalizedPath = normalizeToPosix(file.path);

        if (seen.has(normalizedPath.toLowerCase())) {
            issues.push({ kind: "fatal", message: `Ruta duplicada detectada: ${normalizedPath}` });
        }
        seen.add(normalizedPath.toLowerCase());

        if (normalizedPath.includes("..")) {
            issues.push({ kind: "fatal", message: `Ruta inválida con path traversal: ${normalizedPath}` });
        }

        const isFrontendFile = normalizedPath.startsWith("UI/nitro-groups/");
        const isBackendFile = normalizedPath.startsWith("Core/");
        if (!isFrontendFile && !isBackendFile) {
            issues.push({ kind: "fatal", message: `Ruta fuera de scope permitido: ${normalizedPath}` });
            continue;
        }

        if (isFrontendFile && !modeConfig.generateFrontend) {
            issues.push({ kind: "fatal", message: `Archivo frontend no permitido en modo actual: ${normalizedPath}` });
        }
        if (isBackendFile && !modeConfig.generateBackend) {
            issues.push({ kind: "fatal", message: `Archivo backend no permitido en modo actual: ${normalizedPath}` });
        }

        if (isFrontendFile && !normalizedPath.startsWith(featurePrefix)) {
            issues.push({ kind: "fatal", message: `Archivo frontend fuera del feature '${feature}': ${normalizedPath}` });
        }

        if (isBackendFile && !normalizedPath.startsWith(backendPrefix)) {
            issues.push({ kind: "fatal", message: `Archivo backend fuera del módulo '${moduleName}': ${normalizedPath}` });
        }

        if (normalizedPath.startsWith(`Core/${moduleName}/`) && normalizedPath.includes(`/Domain/Entities/`)) {
            const fullPath = path.join(process.cwd(), normalizedPath);
            if (fs.existsSync(fullPath)) {
                issues.push({ kind: "fatal", message: `No se permite sobrescribir entidad de dominio existente: ${normalizedPath}` });
            }
        }

        if (file.content.includes(`from "react-query"`) || file.content.includes(`from 'react-query'`)) {
            issues.push({ kind: "frontend", message: `Import inválido detectado en ${normalizedPath}: usar '@tanstack/react-query'.` });
        }

        if (normalizedPath.endsWith("/services/" + `${feature}.service.ts`)) {
            if (!file.content.includes(`from "../types/${feature}.types"`)) {
                issues.push({ kind: "frontend", message: `El service ${normalizedPath} debe importar DTOs desde ../types/${feature}.types.` });
            }
            if (!file.content.includes(`from "@/services/auth.service"`)) {
                issues.push({ kind: "frontend", message: `El service ${normalizedPath} debe usar getApiAccessToken desde "@/services/auth.service".` });
            }
        }

        if (isFrontendFile) {
            const hallucinatedImports = detectHallucinatedFrontendImports(file.content);
            for (const bad of hallucinatedImports) {
                issues.push({
                    kind: "frontend",
                    message: `Import fuera de allowlist en ${normalizedPath}: '${bad}'. Revisa la allowlist del prompt frontend.`
                });
            }
        }

        if (isBackendFile && normalizedPath.endsWith(".cs")) {
            const hallucinatedUsings = detectHallucinatedBackendImports(file.content, normalizedPath, moduleName);
            for (const bad of hallucinatedUsings) {
                issues.push({
                    kind: "backend",
                    message: `Using inválido en ${normalizedPath}: '${bad}'. No existe en csproj o vulnera la capa (Application no debe depender de Infrastructure).`
                });
            }
        }
    }

    return {
        isValid: issues.length === 0,
        errors: issues.map(i => i.message),
        issues
    };
}

export function recoverInvalidOutput(
    feature: string,
    moduleName: string,
    files: FileOutput[],
    contract: B2BContract,
    issues: OutputIssue[],
    mode: OrchestratorMode,
    projectRoot: string = process.cwd()
): FileOutput[] | null {
    const modeConfig = getModeConfig(mode);
    const hasFatal = issues.some(i => i.kind === "fatal");
    if (hasFatal) return null;

    const needsFrontendRebuild = issues.some(i => i.kind === "frontend");
    const needsBackendRebuild = issues.some(i => i.kind === "backend");

    let recovered = files;
    const applied: string[] = [];

    if (needsFrontendRebuild && modeConfig.generateFrontend) {
        const frontendCleaned = recovered.filter(f => !normalizeToPosix(f.path).startsWith("UI/nitro-groups/"));
        recovered = applyDeterministicFrontendFallback(feature, contract, frontendCleaned);
        applied.push("frontend");
    }

    if (needsBackendRebuild && modeConfig.generateBackend) {
        const backendCleaned = recovered.filter(f => !normalizeToPosix(f.path).startsWith("Core/"));
        const rebuilt = buildDeterministicBackend(feature, contract, moduleName, { projectRoot });
        recovered = mergeGeneratedFiles(backendCleaned, rebuilt);
        applied.push("backend");
    }

    if (applied.length > 0) {
        console.warn(`   [🛠️] Recuperación determinista aplicada sobre: ${applied.join(", ")}.`);
    }

    return recovered;
}

/**
 * Excluye artefactos peligrosos del LLM: entidades de dominio ya existentes,
 * interfaces bajo `Application/Abstractions/`, y .cs bajo
 * `UseCases/<FeaturePascal>/` sin subcarpeta (p. ej. listFooQueryHandler.cs).
 */
export function sanitizeProtectedFiles(
    moduleName: string,
    files: FileOutput[],
    feature?: string
): { files: FileOutput[]; droppedPaths: string[] } {
    const featurePascal = feature ? toPascalCase(feature) : "";

    const safeFiles: FileOutput[] = [];
    const droppedPaths: string[] = [];
    for (const file of files) {
        const normalizedPath = normalizeToPosix(file.path);
        if (normalizedPath.startsWith(`Core/${moduleName}/`) && normalizedPath.includes(`/Domain/Entities/`)) {
            const fullPath = path.join(process.cwd(), normalizedPath);
            if (fs.existsSync(fullPath)) {
                droppedPaths.push(normalizedPath);
                continue;
            }
        }
        if (/\/Application\/Abstractions\//i.test(normalizedPath) && normalizedPath.endsWith(".cs")) {
            droppedPaths.push(`${normalizedPath} (Abstractions: no se pisan con el LLM)`);
            continue;
        }
        if (featurePascal && isOrphanUseCaseFile(normalizedPath, featurePascal)) {
            droppedPaths.push(`${normalizedPath} (falta subcarpeta: Get, Create, …)`);
            continue;
        }
        const fixed = applyBackendLlmGetAllAsyncFix({ ...file, path: file.path, content: file.content });
        safeFiles.push(fixed);
    }
    return { files: safeFiles, droppedPaths };
}

/**
 * Ruta del estilo `.../UseCases/<Feature>/algo.cs` (sin `Get/`, `Create/`, etc.)
 * bajo <Feature> — inválida en el vertical slice. Insensible a mayúsculas.
 */
function isOrphanUseCaseFile(normalizedPath: string, featurePascal: string): boolean {
    const lowerPath = normalizeToPosix(normalizedPath).toLowerCase();
    const f = featurePascal.toLowerCase();
    const needle = `usecases/${f}/`;
    const at = lowerPath.indexOf(needle);
    if (at === -1) return false;
    const after = lowerPath.slice(at + needle.length);
    if (!/^[a-z0-9._-]+\.cs$/i.test(after)) {
        return false;
    }
    // .../usecases/feat/Handler.cs — suelto; .../usecases/feat/get/handler.cs no coincide (after tiene "/")
    return !after.includes("/");
}
