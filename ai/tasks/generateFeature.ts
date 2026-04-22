import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { generateCode } from "../client";
import { confirmAction } from "../utils/diffViewer";
import { validateContractIntegrity, validateContractVsEntity } from "../validators/b2bValidator";
import { getBackendArchitecturePrompt } from "../prompts/backendArchitecturePrompt";
import { getFrontendArchitecturePrompt } from "../prompts/frontendArchitecturePrompt";
import { extractDomainContext, calculateSemanticHash, runImpactAnalysis, extractDbSchema, resolveDomainContext } from "../utils/contextExtractor";
import { initMemory, recallDecisions, rememberDecision, rememberError, rememberSuccess, recallErrors } from "../memory/engramClient";

import { FileOutput, OrchestratorMode, normalizeToPosix } from "../orchestrator/types";
import { parseMultiFileOutput, mergeGeneratedFiles } from "../orchestrator/generation/parser";
import { applyDeterministicFrontendFallback } from "../orchestrator/generation/frontendFallback";
import { buildDeterministicBackend } from "../orchestrator/generation/backendFallback";
import { validateB2BStructural, summarizeIssues } from "../orchestrator/contract/structuralValidator";
import { repairStructuralIssues } from "../orchestrator/contract/contractRepair";
import { getModeConfig, describeMode } from "../orchestrator/pipeline/modes";

interface CommandCapture { output: string; exitCode: number; }
interface QualityBaseline { tscErrors: Set<string>; dotnetErrors: Set<string>; }

function extractJsonFromResponse(raw: string): string | null {
    const jsonMatch = raw.match(/```json\n([\s\S]*?)```/);
    if (jsonMatch) return jsonMatch[1].trim();
    try { JSON.parse(raw); return raw.trim(); } catch { return null; }
}

function buildModuleName(feature: string): string {
    return feature.charAt(0).toUpperCase() + feature.slice(1);
}

function getRegisteredModulesFromProgram(): string[] {
    const programPath = path.join(process.cwd(), "Services", "NitroGroups.Services.Api", "Program.cs");
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

function extractDomainContextFromModule(moduleName: string): string | null {
    const entityDir = path.join(process.cwd(), "Core", moduleName, `NitroGroups.Core.${moduleName}.Domain`, "Entities");
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

// ═══ Backend: namespaces legítimos por capa ═══
// Ground truth: proyecto usa Cortex.Mediator + AutoMapper + MediatR + FluentValidation en Application.
// EF Core vive SOLO en Infrastructure/Repositories.
const BACKEND_APP_ALLOWED_NAMESPACES = [
    // Cortex.Mediator (obligatorio para Query/Command/Handler)
    "Cortex.Mediator",
    "Cortex.Mediator.Commands",
    "Cortex.Mediator.Queries",
    // MediatR (legacy, aún referenciado)
    "MediatR",
    // FluentValidation
    "FluentValidation",
    // AutoMapper
    "AutoMapper",
    // Shared (autorizado en Application)
    "NitroGroups.Shared.Contracts",
    "NitroGroups.Shared.Abstractions",
    // BCL
    "System", "System.Threading", "System.Threading.Tasks",
    "System.Collections.Generic", "System.Linq", "System.Linq.Expressions"
];

const BACKEND_INFRA_ALLOWED_NAMESPACES = [
    ...BACKEND_APP_ALLOWED_NAMESPACES,
    // Infrastructure EXTRA
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
        // permitido si es prefijo exacto o parent exacto
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
        if (spec.startsWith(".") || spec.startsWith("/")) continue; // relativos siempre ok

        if (spec.startsWith("@/")) {
            if (FRONTEND_ALIAS_ALLOWLIST_EXACT.has(spec)) continue;
            // Permitir subpaths controlados (ej: "@/lib/*", "@/services/*") solo si el top-level es conocido.
            const topLevelAllowed = Array.from(FRONTEND_ALIAS_ALLOWLIST_EXACT)
                .some(allowed => spec.startsWith(allowed + "/"));
            if (topLevelAllowed) continue;
            offenders.add(spec);
            continue;
        }

        // Paquete externo: primer segmento (o los dos si es scoped)
        const parts = spec.split("/");
        const pkg = spec.startsWith("@") ? `${parts[0]}/${parts[1] ?? ""}` : parts[0];
        const allowed = FRONTEND_IMPORT_ALLOWLIST.some(p => p === spec || p === pkg);
        if (!allowed) offenders.add(spec);
    }
    return Array.from(offenders);
}

type OutputIssueKind =
    | "fatal"        // no reparable automáticamente (path traversal, duplicado, scope, overwrite protegido, modo inválido)
    | "frontend"     // reparable por applyDeterministicFrontendFallback
    | "backend";     // reparable por buildDeterministicBackend

interface OutputIssue { kind: OutputIssueKind; message: string; }

function validateGeneratedOutput(
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

/**
 * Dado un set de issues, intenta recuperar reemplazando las secciones reparables
 * por los fallbacks deterministas correspondientes. Retorna los archivos posiblemente
 * corregidos o `null` si hay issues fatales irrecuperables.
 */
function recoverInvalidOutput(
    feature: string,
    moduleName: string,
    files: FileOutput[],
    contract: any,
    issues: OutputIssue[],
    mode: OrchestratorMode
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
        const rebuilt = buildDeterministicBackend(feature, contract, moduleName);
        recovered = mergeGeneratedFiles(backendCleaned, rebuilt);
        applied.push("backend");
    }

    if (applied.length > 0) {
        console.warn(`   [🛠️] Recuperación determinista aplicada sobre: ${applied.join(", ")}.`);
    }

    return recovered;
}

function sanitizeProtectedFiles(moduleName: string, files: FileOutput[]): { files: FileOutput[]; droppedPaths: string[] } {
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
        safeFiles.push(file);
    }
    return { files: safeFiles, droppedPaths };
}

function rollbackWrittenFiles(writtenFiles: Map<string, string | null>) {
    for (const [filePath, previousContent] of writtenFiles.entries()) {
        if (previousContent === null) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            continue;
        }
        fs.writeFileSync(filePath, previousContent);
    }
}

function runCommandCapture(command: string, cwd: string): CommandCapture {
    try {
        const output = execSync(command, { cwd, stdio: "pipe", encoding: "utf-8" });
        return { output: output || "", exitCode: 0 };
    } catch (error: any) {
        const stdout = error?.stdout?.toString?.() || "";
        const stderr = error?.stderr?.toString?.() || "";
        return {
            output: [stdout, stderr].filter(Boolean).join("\n"),
            exitCode: typeof error?.status === "number" ? error.status : 1
        };
    }
}

function extractDiagnostics(output: string, matcher: RegExp): Set<string> {
    const lines = output.split(/\r?\n/);
    const diagnostics = new Set<string>();
    for (const line of lines) {
        const normalized = normalizeToPosix(line).trim().replace(/\s+/g, " ");
        if (!normalized) continue;
        if (matcher.test(normalized)) diagnostics.add(normalized);
    }
    return diagnostics;
}

function collectQualityBaseline(mode: OrchestratorMode): QualityBaseline {
    const rootDir = process.cwd();
    const uiDir = path.join(rootDir, "UI", "nitro-groups");
    const apiProjectPath = path.join(rootDir, "Services", "NitroGroups.Services.Api", "NitroGroups.Services.Api.csproj");
    const modeConfig = getModeConfig(mode);

    const tscBefore = modeConfig.runTypescriptCheck
        ? runCommandCapture("npx tsc --noEmit --pretty false", uiDir)
        : { output: "", exitCode: 0 };
    const dotnetBefore = modeConfig.runDotnetBuild
        ? runCommandCapture(`dotnet build "${apiProjectPath}" --nologo`, rootDir)
        : { output: "", exitCode: 0 };

    return {
        tscErrors: extractDiagnostics(tscBefore.output, /error TS\d+:/i),
        dotnetErrors: extractDiagnostics(dotnetBefore.output, /: error [A-Z]{2}\d+:/i)
    };
}

function getNewDiagnostics(after: Set<string>, before: Set<string>): string[] {
    return Array.from(after).filter(diagnostic => !before.has(diagnostic));
}

function runQualityGates(feature: string, baseline: QualityBaseline, mode: OrchestratorMode): { ok: boolean; details?: string; newTypeScriptErrors?: string[]; newDotnetErrors?: string[] } {
    const rootDir = process.cwd();
    const uiDir = path.join(rootDir, "UI", "nitro-groups");
    const apiProjectPath = path.join(rootDir, "Services", "NitroGroups.Services.Api", "NitroGroups.Services.Api.csproj");
    const modeConfig = getModeConfig(mode);

    if (modeConfig.generateFrontend) {
        const lintResult = runCommandCapture(`npx eslint "src/features/${feature}/**/*.{ts,tsx}" -f unix`, uiDir);
        const lintErrors = extractDiagnostics(lintResult.output, /:\d+:\d+:\s+error\s+/i);
        if (lintErrors.size > 0) {
            return {
                ok: false,
                details: `Errores de ESLint en archivos generados:\n${Array.from(lintErrors).slice(0, 20).join("\n")}`
            };
        }
    }

    if (modeConfig.runTypescriptCheck) {
        const tscAfter = runCommandCapture("npx tsc --noEmit --pretty false", uiDir);
        const tscErrorsAfter = extractDiagnostics(tscAfter.output, /error TS\d+:/i);
        const tscNew = getNewDiagnostics(tscErrorsAfter, baseline.tscErrors);
        if (tscNew.length > 0) {
            return {
                ok: false,
                details: `Nuevos errores de TypeScript:\n${tscNew.slice(0, 30).join("\n")}`,
                newTypeScriptErrors: tscNew
            };
        }
    }

    if (modeConfig.runDotnetBuild) {
        const dotnetAfter = runCommandCapture(`dotnet build "${apiProjectPath}" --nologo`, rootDir);
        const dotnetErrorsAfter = extractDiagnostics(dotnetAfter.output, /: error [A-Z]{2}\d+:/i);
        const dotnetNew = getNewDiagnostics(dotnetErrorsAfter, baseline.dotnetErrors);
        if (dotnetNew.length > 0) {
            return {
                ok: false,
                details: `Nuevos errores de .NET build:\n${dotnetNew.slice(0, 30).join("\n")}`,
                newDotnetErrors: dotnetNew
            };
        }
    }

    return { ok: true };
}

function validateFilesWithRollback(files: FileOutput[], feature: string, baseline: QualityBaseline, mode: OrchestratorMode): { ok: boolean; details?: string; newTypeScriptErrors?: string[]; newDotnetErrors?: string[] } {
    const writtenFiles = new Map<string, string | null>();
    try {
        for (const file of files) {
            const fullPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
            const previousContent = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf-8") : null;
            writtenFiles.set(fullPath, previousContent);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, file.content);
        }

        return runQualityGates(feature, baseline, mode);
    } finally {
        rollbackWrittenFiles(writtenFiles);
    }
}

async function runAutoRepairLoop(
    feature: string,
    moduleName: string,
    initialFiles: FileOutput[],
    baseline: QualityBaseline,
    contract: any,
    mode: OrchestratorMode
): Promise<{ ok: boolean; files: FileOutput[]; lastError?: string }> {
    let workingFiles = [...initialFiles];
    const maxRepairAttempts = 2;
    const modeConfig = getModeConfig(mode);

    for (let attempt = 0; attempt <= maxRepairAttempts; attempt++) {
        const validation = validateFilesWithRollback(workingFiles, feature, baseline, mode);
        if (validation.ok) {
            if (attempt > 0) console.log(`   ✔️ Autocorrección exitosa en intento ${attempt}/${maxRepairAttempts}.`);
            return { ok: true, files: workingFiles };
        }

        const errorSummary = validation.details || "Error desconocido";
        console.warn(`\n⚠️  Intento de validación ${attempt + 1}/${maxRepairAttempts + 1} falló.`);
        console.warn(errorSummary);

        if (attempt === maxRepairAttempts) {
            // Fallbacks deterministas escalonados
            let fallbackFiles = [...workingFiles];
            if (modeConfig.generateFrontend) {
                fallbackFiles = applyDeterministicFrontendFallback(feature, contract, fallbackFiles);
            }

            const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
            if (fallbackValidation.ok) {
                console.log(`   ✔️ Fallback determinista frontend aplicado.`);
                return { ok: true, files: fallbackFiles };
            }

            // Si falla backend, intentar con backend determinista
            if (modeConfig.generateBackend && (fallbackValidation.newDotnetErrors || []).length > 0) {
                const backendDeterministic = buildDeterministicBackend(feature, contract, moduleName);
                const filesWithBoth = mergeGeneratedFiles(
                    fallbackFiles.filter(file => !normalizeToPosix(file.path).startsWith("Core/")),
                    backendDeterministic
                );
                const bothValidation = validateFilesWithRollback(filesWithBoth, feature, baseline, mode);
                if (bothValidation.ok) {
                    console.log(`   ✔️ Fallback determinista backend+frontend aplicado.`);
                    return { ok: true, files: filesWithBoth };
                }

                // Último recurso: aceptar frontend-only si el modo actual lo permite conceptualmente
                if (mode === "full-stack") {
                    const frontendOnly = fallbackFiles.filter(file => normalizeToPosix(file.path).startsWith("UI/"));
                    const frontendOnlyValidation = validateFilesWithRollback(frontendOnly, feature, baseline, mode);
                    if (frontendOnlyValidation.ok) {
                        console.warn(`   ⚠️  Backend descartado por errores críticos; se entregará frontend-only.`);
                        return { ok: true, files: frontendOnly };
                    }
                }

                return { ok: false, files: workingFiles, lastError: bothValidation.details || errorSummary };
            }

            return { ok: false, files: workingFiles, lastError: fallbackValidation.details || errorSummary };
        }

        console.log(`[🛠️] Intentando autocorrección IA (${attempt + 1}/${maxRepairAttempts})...`);
        const repairPrompt = `
Eres un reparador senior full-stack. Debes corregir archivos generados para el feature "${feature}" (módulo backend: "${moduleName}").

ERRORES NUEVOS DETECTADOS:
${errorSummary}

ARCHIVOS ACTUALES A CORREGIR:
${workingFiles.map(file => `[FILE: ${file.path}]\n\`\`\`\n${file.content}\n\`\`\``).join("\n\n")}

REGLAS:
1) Devuelve SOLO archivos corregidos en formato [FILE: path] + bloque markdown.
2) Corrige exactamente los errores reportados.
3) NO cambies rutas de archivo.
4) En frontend usa @tanstack/react-query con object syntax.
5) Tipa correctamente data/error/queries para evitar unknown/{}.
6) No introduzcas dependencias nuevas.
`;

        try {
            const repairedRaw = await generateCode("Fix-first Executor: Senior Fullstack Repair Bot", repairPrompt);
            const repairedFiles = parseMultiFileOutput(repairedRaw);
            if (repairedFiles.length === 0) {
                console.warn(`⚠️  La IA no devolvió patch. Aplicando fallback determinista...`);
                const fallbackFiles = modeConfig.generateFrontend
                    ? applyDeterministicFrontendFallback(feature, contract, workingFiles)
                    : workingFiles;
                const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
                if (fallbackValidation.ok) {
                    return { ok: true, files: fallbackFiles };
                }
                workingFiles = fallbackFiles;
                continue;
            }
            workingFiles = mergeGeneratedFiles(workingFiles, repairedFiles);
        } catch (error: any) {
            const reason = error?.message || "Error desconocido en autocorrección IA";
            console.warn(`⚠️  Autocorrección IA no disponible: ${reason}`);
            const fallbackFiles = modeConfig.generateFrontend
                ? applyDeterministicFrontendFallback(feature, contract, workingFiles)
                : workingFiles;
            const fallbackValidation = validateFilesWithRollback(fallbackFiles, feature, baseline, mode);
            if (fallbackValidation.ok) {
                return { ok: true, files: fallbackFiles };
            }
            return { ok: false, files: workingFiles, lastError: fallbackValidation.details || reason };
        }
    }

    return { ok: false, files: workingFiles, lastError: "Autocorrección agotada." };
}

// ═══════════════════════════════════════════════════════
// FASE A: DISEÑO (DRAFTING INTELIGENTE)
// ═══════════════════════════════════════════════════════

async function runDraftingPhase(feature: string): Promise<boolean> {
    console.log(`\n🧠 ═══ FASE A: DISEÑO INTELIGENTE ═══`);
    console.log(`[📋] No existe contrato B2B para '${feature}'. Iniciando análisis de requerimiento.\n`);

    await initMemory();
    const pastDecisions = await recallDecisions(feature);

    const dbSchema = extractDbSchema();
    const domainContext = extractDomainContext(feature);

    const draftPrompt = `
    Eres un Arquitecto de Software Senior analizando un requerimiento para el proyecto NitroGroups.
    El usuario pide: "Implementar ${feature}"

${pastDecisions.length > 0 ? `
=== DECISIONES PREVIAS RECORDADAS POR ENGRAM ===
Por favor respeta estas decisiones arquitectónicas previamente tomadas:
${pastDecisions.map(d => `- ${d}`).join('\n')}
` : ""}

${dbSchema ? `
=== SCHEMA DE BASE DE DATOS DEL PROYECTO ===
${dbSchema}
` : "No se encontró schema de BD."}

${domainContext ? `
=== ENTIDADES DE DOMINIO (.NET) YA EXISTENTES ===
${domainContext}
` : "No hay entidades de dominio previas para este feature."}

TU TRABAJO TIENE 2 PARTES:

PARTE 1 - PREGUNTAS DE NEGOCIO:
Genera entre 3 y 6 preguntas CRÍTICAS que el desarrollador DEBE responder antes de implementar.
[QUESTIONS]
1. ¿Pregunta? → Opciones: A) opción1 | B) opción2 | C) opción3
[/QUESTIONS]

PARTE 2 - CONTRATO B2B PROPUESTO:
\`\`\`json
{
  "v": "1.0.0",
  "feature": "${feature}",
  "endpoint": "/api/${feature}",
  "scope": { "allowedEndpoints": ["metodo1"], "allowInternalLogic": true },
  "businessRules": { "precision": "decimal", "notes": "..." },
  "entityHash": "INITIAL_SIGNATURE",
  "methods": [
    {
      "name": "nombreAccion",
      "http": "GET",
      "request": { "name": "RequestDTO", "fields": { "campo": { "type": "string" } } },
      "response": { "name": "ResponseDTO", "fields": { "id": { "type": "number" } } }
    }
  ],
  "auth": true
}
\`\`\`
`;

    const response = await generateCode("Eres un Arquitecto de Producto y DDD Senior", draftPrompt);

    console.log("═══════════════════════════════════════");
    console.log(response);
    console.log("═══════════════════════════════════════\n");

    const accept = await confirmAction("¿Deseas guardar este contrato como base? (Podrás editarlo después)");
    if (!accept) {
        console.log("❌ Drafting cancelado.");
        return false;
    }

    const jsonStr = extractJsonFromResponse(response);
    if (!jsonStr) {
        console.error("❌ La IA no devolvió un bloque JSON válido. Intenta de nuevo.");
        return false;
    }

    try {
        const contract = JSON.parse(jsonStr);
        contract.v = contract.v || "1.0.0";
        contract.entityHash = contract.entityHash || "INITIAL_SIGNATURE";

        const contractDir = path.join(__dirname, "../contracts/b2b");
        fs.mkdirSync(contractDir, { recursive: true });
        const contractPath = path.join(contractDir, `${feature}.contract.json`);
        fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));

        await rememberDecision(feature, `Contrato inicial creado. Hash: ${contract.entityHash}.`);

        console.log(`\n✅ Contrato guardado en: ai/contracts/b2b/${feature}.contract.json`);
        console.log(`🔄 Ejecuta 'npm run ai generate-feature ${feature}' para generar el código.\n`);
        return true;
    } catch (e) {
        console.error("❌ No se pudo parsear el JSON del contrato. Revisa la salida manualmente.");
        return false;
    }
}

// ═══════════════════════════════════════════════════════
// FASE B: EJECUCIÓN DETERMINISTA
// ═══════════════════════════════════════════════════════

export interface GenerateFeatureOptions {
    updateHash?: boolean;
    mode?: OrchestratorMode;
}

export async function generateFeature(feature: string, options: GenerateFeatureOptions = {}) {
    const mode: OrchestratorMode = options.mode || "full-stack";
    const modeConfig = getModeConfig(mode);

    console.log(`\n🎛️  Modo: ${mode} — ${describeMode(mode)}`);

    await initMemory();
    const pastErrors = await recallErrors(feature);
    const pastDecisions = await recallDecisions(feature);

    const contractPath = path.join(__dirname, `../contracts/b2b/${feature}.contract.json`);

    if (!fs.existsSync(contractPath)) {
        await runDraftingPhase(feature);
        return;
    }

    const contractStr = fs.readFileSync(contractPath, "utf-8");
    const contract = JSON.parse(contractStr);
    const contractIntegrity = validateContractIntegrity(contract);
    if (!contractIntegrity.isValid) {
        console.error(`\n💥 CONTRATO B2B INVÁLIDO:`);
        contractIntegrity.errors.forEach(error => console.error(`   ❌ ${error}`));
        if (contractIntegrity.warnings.length > 0) {
            contractIntegrity.warnings.forEach(warning => console.warn(`   ⚠️  ${warning}`));
        }
        console.error(`\n   Corrige el contrato antes de continuar.\n`);
        return;
    }
    contractIntegrity.warnings.forEach(warning => console.warn(`⚠️  ${warning}`));

    if (mode === "contract-only") {
        console.log(`\n📄 Contrato '${feature}' validado. Modo contract-only: no se genera código.`);
        return;
    }

    console.log(`\n🤖 ═══ FASE B: EJECUCIÓN DETERMINISTA ═══`);
    console.log(`Feature: '${feature}' [v${contract.v}]`);

    // Resolver módulo backend (relevante aun en frontend-only para referencias correctas)
    const domainResolution = resolveDomainContext(feature);
    let moduleName = domainResolution?.moduleName || buildModuleName(feature);
    let domainContext = domainResolution?.context || extractDomainContext(feature);
    const apiProgramPath = path.join(process.cwd(), "Services", "NitroGroups.Services.Api", "Program.cs");
    const registeredModules = getRegisteredModulesFromProgram();

    if (registeredModules.length > 0 && !registeredModules.includes(moduleName)) {
        const normalizedFeature = feature.toLowerCase();
        const fallbackModule = registeredModules.find(candidate => {
            const context = extractDomainContextFromModule(candidate);
            return context?.toLowerCase().includes(normalizedFeature);
        });

        if (fallbackModule) {
            moduleName = fallbackModule;
            domainContext = extractDomainContextFromModule(fallbackModule);
        }
    }

    if (modeConfig.enforceBackendModule) {
        const expectedApplicationProject = path.join(process.cwd(), "Core", moduleName, `NitroGroups.Core.${moduleName}.Application`);
        const expectedInfrastructureProject = path.join(process.cwd(), "Core", moduleName, `NitroGroups.Core.${moduleName}.Infrastructure`);

        if (!fs.existsSync(expectedApplicationProject) || !fs.existsSync(expectedInfrastructureProject)) {
            console.error(`\n💥 MÓDULO BACKEND NO RESUELTO`);
            console.error(`   No existe un módulo integrado para '${moduleName}' en Core/.`);
            console.error(`   Usa --mode=frontend-only si quieres generar solo UI.\n`);
            return;
        }
        if (fs.existsSync(apiProgramPath)) {
            const programContent = fs.readFileSync(apiProgramPath, "utf-8");
            if (!programContent.includes(`Add${moduleName}Module`)) {
                console.error(`\n💥 MÓDULO NO REGISTRADO EN API HOST`);
                console.error(`   Program.cs no llama a Add${moduleName}Module(...).\n`);
                return;
            }
        }
    }

    console.log(`[🧭] Módulo backend resuelto: ${moduleName}`);

    if (domainContext && modeConfig.generateBackend) {
        const currentHash = calculateSemanticHash(domainContext);

        if (options.updateHash) {
            contract.entityHash = currentHash;
            fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
            console.log(`✅ Hash de entidad actualizado a: ${currentHash}`);
            return;
        }

        if (contract.entityHash !== "INITIAL_SIGNATURE" && contract.entityHash !== currentHash) {
            console.error(`\n💥 DRIFT DETECTADO`);
            console.error(`   Contrato: ${contract.entityHash}`);
            console.error(`   Actual:   ${currentHash}`);
            console.error(`   → Usa 'npm run ai generate-feature ${feature} --update-hash' si es intencional.\n`);
            return;
        }

        console.log(`[🔍] Validando compatibilidad Contrato ↔ Entidad...`);
        const entityValidation = validateContractVsEntity(contract, domainContext);
        entityValidation.warnings.forEach(w => console.warn(`   → ${w}`));
        if (!entityValidation.isValid) {
            console.error(`\n💥 INCOMPATIBILIDAD CRÍTICA Contrato ↔ Entidad:`);
            entityValidation.errors.forEach(e => console.error(`   ❌ ${e}`));
            return;
        }
        console.log(`✅ Contrato y Entidad son compatibles.`);
    }

    console.log(`[🔎] Analizando impacto en Core/ y UI/...`);
    const impact = runImpactAnalysis(feature, contract);
    const riskLabel = impact.risk === 'HIGH' ? '🔴 ALTO' : impact.risk === 'MEDIUM' ? '🟡 MEDIO' : '🟢 BAJO';
    console.log(`   Riesgo: ${riskLabel} (${impact.files.length} archivos afectados)`);
    if (impact.risk === 'HIGH') {
        const proceed = await confirmAction("\n🔴 RIESGO ALTO: Este cambio afecta múltiples archivos. ¿Continuar?");
        if (!proceed) return;
    }

    const errorContextTemplate = pastErrors.length > 0 ? `\n\n=== ERRORES PASADOS (¡NO REPETIR!) ===\n${pastErrors.join('\n')}` : "";
    const decisionContextTemplate = pastDecisions.length > 0 ? `\n\n=== DECISIONES ARQUITECTÓNICAS ===\n${pastDecisions.join('\n')}` : "";

    const backFiles: FileOutput[] = [];
    const frontFiles: FileOutput[] = [];

    if (modeConfig.generateBackend) {
        console.log(`\n[🚀] Generando Backend (.NET Vertical Slices)...`);
        let promptBack = getBackendArchitecturePrompt(JSON.stringify(contract, null, 2), domainContext, moduleName);
        promptBack += errorContextTemplate + decisionContextTemplate;
        try {
            const rawBack = await generateCode("Disciplined Executor: Arquitecto .NET Senior", promptBack);
            backFiles.push(...parseMultiFileOutput(rawBack));
        } catch (error: any) {
            const details = error?.message || "Error desconocido durante generación backend";
            console.warn(`\n⚠️  GENERACIÓN BACKEND IA FALLÓ: ${details}`);
            console.warn(`   → Aplicando backend determinista como base.`);
            backFiles.push(...buildDeterministicBackend(feature, contract, moduleName));
            await rememberError(feature, "Fallback backend determinista aplicado", details.substring(0, 4000));
        }
    }

    if (modeConfig.generateFrontend) {
        console.log(`[🚀] Generando Frontend (React/TypeScript)...`);
        let promptFront = getFrontendArchitecturePrompt(JSON.stringify(contract, null, 2));
        promptFront += errorContextTemplate + decisionContextTemplate;
        try {
            const rawFront = await generateCode("Disciplined Executor: Arquitecto React Senior", promptFront);
            frontFiles.push(...parseMultiFileOutput(rawFront));
        } catch (error: any) {
            const details = error?.message || "Error desconocido durante generación frontend";
            console.warn(`\n⚠️  GENERACIÓN FRONTEND IA FALLÓ: ${details}`);
            console.warn(`   → Aplicando frontend determinista como base.`);
            // Dejar vacío: el fallback determinista se aplicará en el loop si validación falla
        }
    }

    let generatedFiles = [...backFiles, ...frontFiles];

    // Si el backend quedó vacío pero el modo lo requiere, aplicar fallback proactivo
    if (modeConfig.generateBackend && generatedFiles.filter(f => normalizeToPosix(f.path).startsWith("Core/")).length === 0) {
        generatedFiles.push(...buildDeterministicBackend(feature, contract, moduleName));
    }
    if (modeConfig.generateFrontend && generatedFiles.filter(f => normalizeToPosix(f.path).startsWith("UI/")).length === 0) {
        generatedFiles = applyDeterministicFrontendFallback(feature, contract, generatedFiles);
    }

    const sanitized = sanitizeProtectedFiles(moduleName, generatedFiles);
    generatedFiles = sanitized.files;
    if (sanitized.droppedPaths.length > 0) {
        console.warn(`\n⚠️  Se omitieron archivos protegidos:`);
        sanitized.droppedPaths.forEach(file => console.warn(`   → ${file}`));
    }

    if (generatedFiles.length === 0) {
        console.error("❌ No se obtuvo ningún archivo generado. Revisa prompts o contrato.");
        return;
    }

    let outputValidation = validateGeneratedOutput(feature, moduleName, generatedFiles, mode);
    if (!outputValidation.isValid) {
        console.warn(`\n⚠️  Salida LLM fuera de reglas:`);
        outputValidation.errors.forEach(error => console.warn(`   · ${error}`));
        const recovered = recoverInvalidOutput(feature, moduleName, generatedFiles, contract, outputValidation.issues, mode);
        if (!recovered) {
            console.error(`\n💥 SALIDA GENERADA INVÁLIDA (issues fatales, no recuperables):`);
            outputValidation.issues.filter(i => i.kind === "fatal").forEach(i => console.error(`   ❌ ${i.message}`));
            await rememberError(feature, "Salida IA inválida", outputValidation.errors.join(" | "));
            return;
        }
        generatedFiles = recovered;
        outputValidation = validateGeneratedOutput(feature, moduleName, generatedFiles, mode);
        if (!outputValidation.isValid) {
            console.error(`\n💥 RECUPERACIÓN DETERMINISTA NO CORRIGIÓ LA SALIDA:`);
            outputValidation.errors.forEach(error => console.error(`   ❌ ${error}`));
            await rememberError(feature, "Recuperación determinista inválida", outputValidation.errors.join(" | "));
            return;
        }
        console.log(`   ✔️ Salida recuperada con fallback determinista.`);
    }

    // ── Validación B2B Estructural + Reparación dirigida ──
    console.log(`\n[🛡️] Validación B2B estructural (Front ↔ Back ↔ Contrato)...`);
    let structural = validateB2BStructural(contract, generatedFiles, {
        includeBackend: modeConfig.validateBackendStructural,
        includeFrontend: modeConfig.validateFrontendStructural
    });

    let repairAttempts = 0;
    while (!structural.ok && repairAttempts < 3) {
        const repair = repairStructuralIssues(generatedFiles, contract, structural.issues);
        if (!repair.changed) break;
        generatedFiles = repair.files;
        repairAttempts++;
        console.log(`   [🛠️] Reparación B2B dirigida: ${repair.applied.join(", ")}`);
        structural = validateB2BStructural(contract, generatedFiles, {
            includeBackend: modeConfig.validateBackendStructural,
            includeFrontend: modeConfig.validateFrontendStructural
        });
    }

    if (!structural.ok) {
        // Si no pudo repararse, rebuildear las secciones correspondientes de forma determinista
        console.warn(`\n⚠️  Problemas estructurales residuales. Aplicando fallbacks deterministas...`);
        structural.issues.filter(i => i.severity === "error").forEach(i => console.warn(`   - ${i.code}: ${i.message}`));

        const hasBackendIssue = structural.issues.some(i => i.lang === "C#" || i.code === "B2B_BACKEND_ENDPOINT_MISSING");
        const hasFrontendIssue = structural.issues.some(i => i.lang === "TS" || i.code === "B2B_ROUTE_MISMATCH");

        if (modeConfig.generateBackend && hasBackendIssue) {
            const rebuiltBackend = buildDeterministicBackend(feature, contract, moduleName);
            generatedFiles = mergeGeneratedFiles(
                generatedFiles.filter(f => !normalizeToPosix(f.path).startsWith("Core/")),
                rebuiltBackend
            );
        }
        if (modeConfig.generateFrontend && hasFrontendIssue) {
            generatedFiles = applyDeterministicFrontendFallback(feature, contract, generatedFiles);
        }

        structural = validateB2BStructural(contract, generatedFiles, {
            includeBackend: modeConfig.validateBackendStructural,
            includeFrontend: modeConfig.validateFrontendStructural
        });
    }

    if (!structural.ok) {
        console.error(`\n💥 FALLO DE COHERENCIA B2B (no se pudo reparar):`);
        console.error(summarizeIssues(structural.issues));
        await rememberError(feature, "Fallo coherencia B2B post-repair", summarizeIssues(structural.issues).substring(0, 4000));
        return;
    }
    console.log(`   ✔️ Coherencia B2B garantizada.`);

    console.log(`\n[🔁] Ejecutando Quality Gates con autocorrección...`);
    const baseline = collectQualityBaseline(mode);
    const repairResult = await runAutoRepairLoop(feature, moduleName, generatedFiles, baseline, contract, mode);
    if (!repairResult.ok) {
        const details = repairResult.lastError || "Autocorrección agotada";
        console.error(`\n💥 NO SE PUDO AUTOCORREGIR LA GENERACIÓN.`);
        console.error(`   ${details}\n`);
        await rememberError(feature, "Autocorrección agotada", details.substring(0, 4000));
        return;
    }
    generatedFiles = repairResult.files;

    let postRepairValidation = validateGeneratedOutput(feature, moduleName, generatedFiles, mode);
    if (!postRepairValidation.isValid) {
        const recovered = recoverInvalidOutput(feature, moduleName, generatedFiles, contract, postRepairValidation.issues, mode);
        if (recovered) {
            generatedFiles = recovered;
            postRepairValidation = validateGeneratedOutput(feature, moduleName, generatedFiles, mode);
        }
    }
    if (!postRepairValidation.isValid) {
        const details = postRepairValidation.errors.join(" | ");
        console.error(`\n💥 AUTOCORRECCIÓN PRODUJO SALIDA FUERA DE REGLAS.`);
        postRepairValidation.errors.forEach(error => console.error(`   ❌ ${error}`));
        await rememberError(feature, "Autocorrección inválida", details.substring(0, 4000));
        return;
    }

    const backendReady = generatedFiles.filter(file => normalizeToPosix(file.path).startsWith("Core/")).length;
    const frontendReady = generatedFiles.filter(file => normalizeToPosix(file.path).startsWith("UI/")).length;
    console.log(`\n✅ Coherencia garantizada. ${generatedFiles.length} archivos listos:`);
    console.log(`   Backend: ${backendReady} archivos`);
    console.log(`   Frontend: ${frontendReady} archivos`);
    generatedFiles.forEach(f => console.log(`     → ${f.path}`));

    const save = await confirmAction(`\n¿Escribir los ${generatedFiles.length} archivos en la arquitectura real?`);
    if (!save) {
        console.log("❌ Operación abortada.");
        return;
    }

    const writtenFiles = new Map<string, string | null>();
    try {
        for (const file of generatedFiles) {
            const fullPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
            const previousContent = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf-8") : null;
            writtenFiles.set(fullPath, previousContent);

            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, file.content);
            console.log(`  ✔️ ${file.path}`);
        }

        console.log(`\n[🧪] Ejecutando Quality Gates finales...`);
        const qualityResult = runQualityGates(feature, baseline, mode);
        if (!qualityResult.ok) {
            throw new Error(qualityResult.details || "Quality gate fallido");
        }
        console.log(`   ✔️ Quality Gates superados.`);
    } catch (error: any) {
        rollbackWrittenFiles(writtenFiles);
        const details = error?.message || "Error desconocido";
        console.error(`\n💥 Quality Gate FAILED. Se revirtieron todos los archivos generados.`);
        console.error(`   Detalle: ${details.substring(0, 1500)}\n`);
        await rememberError(feature, "Quality Gate fallido", details.substring(0, 4000));
        return;
    }

    const logDir = path.join(__dirname, "../logs");
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, "success.json");
    const logData = {
        feature,
        mode,
        filesGenerated: generatedFiles.length,
        risk: impact.risk,
        timestamp: new Date().toISOString()
    };
    const existing = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf-8")) : [];
    existing.push(logData);
    fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));

    await rememberSuccess(feature, `Generado (modo=${mode}) con ${backendReady} back y ${frontendReady} front.`, generatedFiles.length);

    console.log(`\n🚀 Feature '${feature}' desplegado exitosamente (modo=${mode}).`);
}
