import fs from "fs";
import path from "path";
import { FileOutput } from "../types";

const SANDBOX_ROOT = path.join("ai", ".sandbox");
const MANIFEST_FILE = "manifest.json";

export interface SandboxManifest {
    feature: string;
    mode: string;
    createdAt: string;
    verdict?: string;
    files: { path: string; bytes: number }[];
}

function ensureSandboxRoot(projectRoot: string): string {
    const root = path.join(projectRoot, SANDBOX_ROOT);
    fs.mkdirSync(root, { recursive: true });
    return root;
}

function timestampSegment(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Copia los archivos generados a `ai/.sandbox/<ts>-<feature>/` antes de la
 * escritura al árbol real. Si el run falla o el quality gate abortea, el
 * sandbox queda como evidencia para post-mortem.
 *
 * NO reemplaza al rollback atómico del árbol real — son capas distintas:
 *  - Rollback: garantiza que el árbol real queda intocado ante fallo.
 *  - Sandbox: preserva lo que la IA pretendía escribir para auditoría.
 */
export function snapshotToSandbox(
    feature: string,
    mode: string,
    files: FileOutput[],
    projectRoot: string
): { dir: string; manifest: SandboxManifest } {
    const root = ensureSandboxRoot(projectRoot);
    const dir = path.join(root, `${timestampSegment()}-${feature}`);
    fs.mkdirSync(dir, { recursive: true });

    const manifestEntries: { path: string; bytes: number }[] = [];
    for (const file of files) {
        const sandboxPath = path.join(dir, file.path);
        fs.mkdirSync(path.dirname(sandboxPath), { recursive: true });
        fs.writeFileSync(sandboxPath, file.content);
        manifestEntries.push({ path: file.path, bytes: Buffer.byteLength(file.content, "utf-8") });
    }

    const manifest: SandboxManifest = {
        feature,
        mode,
        createdAt: new Date().toISOString(),
        files: manifestEntries
    };
    fs.writeFileSync(path.join(dir, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
    return { dir, manifest };
}

export function stampSandboxVerdict(dir: string, verdict: string): void {
    const manifestPath = path.join(dir, MANIFEST_FILE);
    if (!fs.existsSync(manifestPath)) return;
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as SandboxManifest;
        manifest.verdict = verdict;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    } catch {
        // noop
    }
}

/**
 * Elimina sandboxes más viejos que `maxAgeDays`. Útil para correr al inicio de
 * cada run: mantiene el histórico útil y descarta el ruido.
 */
export function gcOldSandboxes(projectRoot: string, maxAgeDays: number): { removed: string[]; kept: number } {
    const root = path.join(projectRoot, SANDBOX_ROOT);
    if (!fs.existsSync(root)) return { removed: [], kept: 0 };

    const threshold = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const removed: string[] = [];
    let kept = 0;

    for (const entry of fs.readdirSync(root)) {
        const full = path.join(root, entry);
        let stat: fs.Stats;
        try { stat = fs.statSync(full); } catch { continue; }
        if (!stat.isDirectory()) continue;

        if (stat.mtimeMs < threshold) {
            try {
                fs.rmSync(full, { recursive: true, force: true });
                removed.push(entry);
            } catch {
                // si no se puede, seguimos
            }
        } else {
            kept++;
        }
    }
    return { removed, kept };
}
