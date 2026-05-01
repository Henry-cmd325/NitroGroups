"use strict";
/**
 * Verifica que los secretos del orquestador (`ai/.env`) NO estén
 * indexados por git. Si lo están, muestra una advertencia prominente.
 *
 * Racional: el archivo contiene claves de Groq/Cerebras/Gemini que, si
 * se comitean, exponen gastos reales. Detectarlo una sola vez al
 * iniciar cualquier comando del orquestador basta: el usuario recibe
 * la señal antes de generar features.
 *
 * La verificación es best-effort (usa `git ls-files`). Si git no está
 * disponible o el archivo no existe, la función es no-op.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnIfEnvInGitRepo = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
function warnIfEnvInGitRepo(aiDir) {
    const envPath = path_1.default.join(aiDir, ".env");
    if (!fs_1.default.existsSync(envPath))
        return;
    const repoRoot = path_1.default.resolve(aiDir, "..");
    const dotgit = path_1.default.join(repoRoot, ".git");
    if (!fs_1.default.existsSync(dotgit))
        return;
    const relative = path_1.default.relative(repoRoot, envPath).replace(/\\/g, "/");
    // 1) ¿Está trackeado ahora mismo?
    const ls = (0, child_process_1.spawnSync)("git", ["ls-files", "--error-unmatch", relative], {
        cwd: repoRoot,
        encoding: "utf-8",
        timeout: 3000
    });
    if (ls.status === 0) {
        printEnvWarning(relative, "Está trackeado por git (aparece en git ls-files). Sácalo con `git rm --cached`.");
        return;
    }
    // 2) ¿Está en el .gitignore?
    const gitignorePath = path_1.default.join(repoRoot, ".gitignore");
    if (fs_1.default.existsSync(gitignorePath)) {
        const content = fs_1.default.readFileSync(gitignorePath, "utf-8");
        const patterns = [`${relative}`, `ai/.env`, `.env`];
        const ignored = patterns.some(p => new RegExp(`^${p.replace(/\//g, "\\/").replace(/\./g, "\\.")}\\b`, "m").test(content));
        if (!ignored) {
            printEnvWarning(relative, `No aparece en .gitignore. Añade \`ai/.env\` al root .gitignore para evitar commits accidentales.`);
        }
        return;
    }
    printEnvWarning(relative, "No hay .gitignore en la raíz del repo; crea uno y añade `ai/.env`.");
}
exports.warnIfEnvInGitRepo = warnIfEnvInGitRepo;
function printEnvWarning(envPath, reason) {
    console.warn("");
    console.warn("🚨 SECRETOS EXPUESTOS:");
    console.warn(`   ${envPath} contiene claves de LLM providers (Groq/Cerebras/Gemini).`);
    console.warn(`   ${reason}`);
    console.warn("");
}
