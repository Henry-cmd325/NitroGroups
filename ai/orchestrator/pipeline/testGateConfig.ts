/**
 * Comandos opcionales de `dotnet test` / `npm test` para el quality gate.
 * Baseline vs run = solo **señales de fallo nuevas** (ver `extractTestFailureSignals`).
 *
 * Prioridad: ORCH_TEST_GATE=0 → nada. Luego ORCH_DOTNET_TEST_CMD / ORCH_UI_TEST_CMD.
 * Si no hay env, se usa `ai/test-gate.config.json` en la raíz del repo.
 */
import fs from "fs";
import path from "path";

import type { ModeConfig } from "./modes";

export interface TestGateCommand {
    id: string;
    cwd: string;
    run: string;
    /** Si true, solo con generación backend (p. ej. `dotnet test`). */
    backendOnly?: boolean;
    /** Si true, solo con generación frontend. */
    frontendOnly?: boolean;
}

const CONFIG_PATH = "ai/test-gate.config.json";

function loadJsonConfig(rootDir: string): { commands: TestGateCommand[] } {
    const p = path.join(rootDir, CONFIG_PATH);
    if (!fs.existsSync(p)) return { commands: [] };
    try {
        const raw = JSON.parse(fs.readFileSync(p, "utf-8")) as { commands?: TestGateCommand[] };
        return { commands: Array.isArray(raw.commands) ? raw.commands : [] };
    } catch {
        return { commands: [] };
    }
}

function envOrSplit(cmd: string | undefined, cwdDefault: string): TestGateCommand | null {
    if (!cmd || !cmd.trim()) return null;
    return { id: "env-override", cwd: cwdDefault, run: cmd.trim() };
}

/**
 * Comandos a ejecutar según modo y flags de entorno.
 */
export function resolveTestGateCommands(rootDir: string, modeConfig: ModeConfig): TestGateCommand[] {
    if (process.env.ORCH_TEST_GATE === "0" || process.env.ORCH_TEST_GATE === "false") {
        return [];
    }

    const fromEnv: TestGateCommand[] = [];
    const dotnet = process.env.ORCH_DOTNET_TEST_CMD?.trim();
    const ui = process.env.ORCH_UI_TEST_CMD?.trim();
    if (dotnet) {
        fromEnv.push({ id: "env-dotnet", cwd: rootDir, run: dotnet, backendOnly: true });
    }
    if (ui) {
        fromEnv.push({ id: "env-ui", cwd: path.join(rootDir, "UI", "nitro-groups"), run: ui, frontendOnly: true });
    }
    if (fromEnv.length > 0) {
        return fromEnv.filter(c => shouldRunCommand(c, modeConfig));
    }

    const { commands: fromFile } = loadJsonConfig(rootDir);
    return fromFile
        .map(c => ({
            id: String(c.id || "cmd"),
            cwd: path.isAbsolute(c.cwd) ? c.cwd : path.join(rootDir, c.cwd || "."),
            run: String(c.run),
            backendOnly: c.backendOnly,
            frontendOnly: c.frontendOnly
        }))
        .filter(c => shouldRunCommand(c, modeConfig));
}

function shouldRunCommand(c: TestGateCommand, modeConfig: ModeConfig): boolean {
    if (c.backendOnly === true && !modeConfig.generateBackend) return false;
    if (c.frontendOnly === true && !modeConfig.generateFrontend) return false;
    if (c.backendOnly === undefined && c.frontendOnly === undefined) {
        if (/^dotnet test/i.test(c.run)) return modeConfig.generateBackend;
        if (/^(npm|pnpm|npx|yarn|vitest|jest)\b/i.test(c.run) || c.run.includes("vitest")) {
            return modeConfig.generateFrontend;
        }
    }
    return true;
}
