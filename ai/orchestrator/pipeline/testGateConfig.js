"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTestGateCommands = void 0;
/**
 * Comandos opcionales de `dotnet test` / `npm test` para el quality gate.
 * Baseline vs run = solo **señales de fallo nuevas** (ver `extractTestFailureSignals`).
 *
 * Prioridad: ORCH_TEST_GATE=0 → nada. Luego ORCH_DOTNET_TEST_CMD / ORCH_UI_TEST_CMD.
 * Si no hay env, se usa `ai/test-gate.config.json` en la raíz del repo.
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_PATH = "ai/test-gate.config.json";
function loadJsonConfig(rootDir) {
    const p = path_1.default.join(rootDir, CONFIG_PATH);
    if (!fs_1.default.existsSync(p))
        return { commands: [] };
    try {
        const raw = JSON.parse(fs_1.default.readFileSync(p, "utf-8"));
        return { commands: Array.isArray(raw.commands) ? raw.commands : [] };
    }
    catch {
        return { commands: [] };
    }
}
function envOrSplit(cmd, cwdDefault) {
    if (!cmd || !cmd.trim())
        return null;
    return { id: "env-override", cwd: cwdDefault, run: cmd.trim() };
}
/**
 * Comandos a ejecutar según modo y flags de entorno.
 */
function resolveTestGateCommands(rootDir, modeConfig) {
    if (process.env.ORCH_TEST_GATE === "0" || process.env.ORCH_TEST_GATE === "false") {
        return [];
    }
    const fromEnv = [];
    const dotnet = process.env.ORCH_DOTNET_TEST_CMD?.trim();
    const ui = process.env.ORCH_UI_TEST_CMD?.trim();
    if (dotnet) {
        fromEnv.push({ id: "env-dotnet", cwd: rootDir, run: dotnet, backendOnly: true });
    }
    if (ui) {
        fromEnv.push({ id: "env-ui", cwd: path_1.default.join(rootDir, "UI", "nitro-groups"), run: ui, frontendOnly: true });
    }
    if (fromEnv.length > 0) {
        return fromEnv.filter(c => shouldRunCommand(c, modeConfig));
    }
    const { commands: fromFile } = loadJsonConfig(rootDir);
    return fromFile
        .map(c => ({
        id: String(c.id || "cmd"),
        cwd: path_1.default.isAbsolute(c.cwd) ? c.cwd : path_1.default.join(rootDir, c.cwd || "."),
        run: String(c.run),
        backendOnly: c.backendOnly,
        frontendOnly: c.frontendOnly
    }))
        .filter(c => shouldRunCommand(c, modeConfig));
}
exports.resolveTestGateCommands = resolveTestGateCommands;
function shouldRunCommand(c, modeConfig) {
    if (c.backendOnly === true && !modeConfig.generateBackend)
        return false;
    if (c.frontendOnly === true && !modeConfig.generateFrontend)
        return false;
    if (c.backendOnly === undefined && c.frontendOnly === undefined) {
        if (/^dotnet test/i.test(c.run))
            return modeConfig.generateBackend;
        if (/^(npm|pnpm|npx|yarn|vitest|jest)\b/i.test(c.run) || c.run.includes("vitest")) {
            return modeConfig.generateFrontend;
        }
    }
    return true;
}
