/**
 * Baseline de calidad + ejecución de quality gates (ESLint, tsc, dotnet).
 *
 * El baseline captura los diagnósticos *antes* de generar para que los gates
 * solo fallen por errores **nuevos** introducidos por el run.
 *
 * Extraído de `generateFeature.ts` — refactor v1.2 Sesión 2.
 */

import path from "path";
import { execSync } from "child_process";

import { getModeConfig } from "./modes";
import { resolveTestGateCommands } from "./testGateConfig";
import { normalizeToPosix, type OrchestratorMode } from "../types";

export interface CommandCapture {
    output: string;
    exitCode: number;
}

export interface QualityBaseline {
    tscErrors: Set<string>;
    dotnetErrors: Set<string>;
    /** ESLint (solo `src/features/<feature>/**`) al inicio del run, para exigir solo errores *nuevos*. */
    eslintFeatureErrors: Set<string>;
    /**
     * Señales de fallo de `dotnet test` / `npm test` (prefijo `id::`), solo nuevas
     * vs el baseline bloquean el gate.
     */
    testFailureSignals: Set<string>;
}

export function runCommandCapture(command: string, cwd: string): CommandCapture {
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

export function extractDiagnostics(output: string, matcher: RegExp): Set<string> {
    const lines = output.split(/\r?\n/);
    const diagnostics = new Set<string>();
    for (const line of lines) {
        const normalized = normalizeToPosix(line).trim().replace(/\s+/g, " ");
        if (!normalized) continue;
        if (matcher.test(normalized)) diagnostics.add(normalized);
    }
    return diagnostics;
}

export function collectQualityBaseline(mode: OrchestratorMode, feature: string): QualityBaseline {
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
    const eslintBefore =
        modeConfig.generateFrontend
            ? runCommandCapture(
                  `npx eslint "src/features/${feature}/**/*.{ts,tsx}" -f unix --no-error-on-unmatched-pattern`,
                  uiDir
              )
            : { output: "", exitCode: 0 };
    const testBefore = runTestCommandsAndCollect(rootDir, mode);

    return {
        tscErrors: extractDiagnostics(tscBefore.output, /error TS\d+:/i),
        dotnetErrors: extractDiagnostics(dotnetBefore.output, /: error [A-Z]{2}\d+:/i),
        eslintFeatureErrors: extractDiagnostics(eslintBefore.output, /:\d+:\d+:\s+error\s+/i),
        testFailureSignals: testBefore.merged
    };
}

export function getNewDiagnostics(after: Set<string>, before: Set<string>): string[] {
    return Array.from(after).filter(diagnostic => !before.has(diagnostic));
}

/**
 * Líneas “firma” de salida de test cuando el proceso no termina en 0.
 * Se prefija con `commandId::` para diff entre comandos.
 */
export function extractTestFailureSignals(commandId: string, output: string, exitCode: number): Set<string> {
    if (exitCode === 0) return new Set();
    const lines = (output + "").split(/\r?\n/);
    const sig = new Set<string>();
    for (const raw of lines) {
        const line = normalizeToPosix(raw).trim().replace(/\s+/g, " ");
        if (!line) continue;
        if (
            /^(Failed!|Error Message:|Stack Trace:)/i.test(line) ||
            /^\s+at\s+/i.test(line) ||
            /^\[xUnit\.net/i.test(line) ||
            /^(Xunit|Assert)\./i.test(line) ||
            /\b(Expected|Actual)\b/i.test(line) ||
            /Test Run Failed\./i.test(line) ||
            /:\s*error\s+(CS|MSB)/i.test(line) ||
            /Total tests:\s.*Failed:\s*[1-9]/i.test(line) ||
            /\bTests?\s+in group:\s*.*failed/i.test(line)
        ) {
            sig.add(`${commandId}::${line}`);
        }
    }
    if (sig.size === 0) {
        for (const raw of lines.slice(0, 40)) {
            const line = normalizeToPosix(raw).trim().replace(/\s+/g, " ");
            if (line) sig.add(`${commandId}::${line}`);
        }
    }
    return sig;
}

function runTestCommandsAndCollect(
    rootDir: string,
    mode: OrchestratorMode
): { merged: Set<string>; lastFailedOutput: string; lastCommandId: string } {
    const modeConfig = getModeConfig(mode);
    const merged = new Set<string>();
    let lastFailedOutput = "";
    let lastCommandId = "";
    if (!modeConfig.runTestGate) {
        return { merged, lastFailedOutput, lastCommandId };
    }
    for (const cmd of resolveTestGateCommands(rootDir, modeConfig)) {
        const cap = runCommandCapture(cmd.run, cmd.cwd);
        const part = extractTestFailureSignals(cmd.id, cap.output, cap.exitCode);
        for (const p of part) merged.add(p);
        if (cap.exitCode !== 0) {
            lastFailedOutput = cap.output;
            lastCommandId = cmd.id;
        }
    }
    return { merged, lastFailedOutput, lastCommandId };
}

export function runQualityGates(
    feature: string,
    baseline: QualityBaseline,
    mode: OrchestratorMode
): { ok: boolean; details?: string; newTypeScriptErrors?: string[]; newDotnetErrors?: string[]; newTestSignals?: string[] } {
    const rootDir = process.cwd();
    const uiDir = path.join(rootDir, "UI", "nitro-groups");
    const apiProjectPath = path.join(rootDir, "Services", "NitroGroups.Services.Api", "NitroGroups.Services.Api.csproj");
    const modeConfig = getModeConfig(mode);

    if (modeConfig.generateFrontend) {
        const lintResult = runCommandCapture(
            `npx eslint "src/features/${feature}/**/*.{ts,tsx}" -f unix --no-error-on-unmatched-pattern`,
            uiDir
        );
        const lintErrorsAfter = extractDiagnostics(lintResult.output, /:\d+:\d+:\s+error\s+/i);
        const eslintNew = getNewDiagnostics(lintErrorsAfter, baseline.eslintFeatureErrors ?? new Set());
        if (eslintNew.length > 0) {
            return {
                ok: false,
                details: `Nuevos errores de ESLint (feature/carpeta):\n${eslintNew.slice(0, 25).join("\n")}`
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

    if (modeConfig.runTestGate) {
        const testAfter = runTestCommandsAndCollect(rootDir, mode);
        const testNew = getNewDiagnostics(testAfter.merged, baseline.testFailureSignals ?? new Set());
        if (testNew.length > 0) {
            const snippet = testAfter.lastFailedOutput
                ? testAfter.lastFailedOutput.length > 8000
                    ? testAfter.lastFailedOutput.slice(0, 8000) + "\n…[truncado]"
                    : testAfter.lastFailedOutput
                : testNew.join("\n");
            return {
                ok: false,
                details: `Nuevas señales de fallo en tests (comando: ${testAfter.lastCommandId || "—"}). Firmas:\n${testNew.slice(0, 40).join("\n")}\n\n--- Salida (recorte) ---\n${snippet}`,
                newTestSignals: testNew
            };
        }
    }

    return { ok: true };
}
