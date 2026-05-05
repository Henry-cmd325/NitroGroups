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

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

export function warnIfEnvInGitRepo(aiDir: string): void {
    const envPath = path.join(aiDir, ".env");
    if (!fs.existsSync(envPath)) return;

    const repoRoot = path.resolve(aiDir, "..");
    const dotgit = path.join(repoRoot, ".git");
    if (!fs.existsSync(dotgit)) return;

    const relative = path.relative(repoRoot, envPath).replace(/\\/g, "/");

    // 1) ¿Está trackeado ahora mismo?
    const ls = spawnSync("git", ["ls-files", "--error-unmatch", relative], {
        cwd: repoRoot,
        encoding: "utf-8",
        timeout: 3000
    });

    if (ls.status === 0) {
        printEnvWarning(relative, "Está trackeado por git (aparece en git ls-files). Sácalo con `git rm --cached`.");
        return;
    }

    // 2) ¿Está en el .gitignore?
    const gitignorePath = path.join(repoRoot, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, "utf-8");
        const patterns = [`${relative}`, `ai/.env`, `.env`];
        const ignored = patterns.some(p => new RegExp(`^${p.replace(/\//g, "\\/").replace(/\./g, "\\.")}\\b`, "m").test(content));
        if (!ignored) {
            printEnvWarning(relative, `No aparece en .gitignore. Añade \`ai/.env\` al root .gitignore para evitar commits accidentales.`);
        }
        return;
    }

    printEnvWarning(relative, "No hay .gitignore en la raíz del repo; crea uno y añade `ai/.env`.");
}

function printEnvWarning(envPath: string, reason: string) {
    console.warn("");
    console.warn("🚨 SECRETOS EXPUESTOS:");
    console.warn(`   ${envPath} contiene claves de LLM providers (Groq/Cerebras/Gemini).`);
    console.warn(`   ${reason}`);
    console.warn("");
}
