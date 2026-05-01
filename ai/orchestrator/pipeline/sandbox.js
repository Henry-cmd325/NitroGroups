"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcOldSandboxes = exports.stampSandboxVerdict = exports.snapshotToSandbox = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SANDBOX_ROOT = path_1.default.join("ai", ".sandbox");
const MANIFEST_FILE = "manifest.json";
function ensureSandboxRoot(projectRoot) {
    const root = path_1.default.join(projectRoot, SANDBOX_ROOT);
    fs_1.default.mkdirSync(root, { recursive: true });
    return root;
}
function timestampSegment() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
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
function snapshotToSandbox(feature, mode, files, projectRoot) {
    const root = ensureSandboxRoot(projectRoot);
    const dir = path_1.default.join(root, `${timestampSegment()}-${feature}`);
    fs_1.default.mkdirSync(dir, { recursive: true });
    const manifestEntries = [];
    for (const file of files) {
        const sandboxPath = path_1.default.join(dir, file.path);
        fs_1.default.mkdirSync(path_1.default.dirname(sandboxPath), { recursive: true });
        fs_1.default.writeFileSync(sandboxPath, file.content);
        manifestEntries.push({ path: file.path, bytes: Buffer.byteLength(file.content, "utf-8") });
    }
    const manifest = {
        feature,
        mode,
        createdAt: new Date().toISOString(),
        files: manifestEntries
    };
    fs_1.default.writeFileSync(path_1.default.join(dir, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
    return { dir, manifest };
}
exports.snapshotToSandbox = snapshotToSandbox;
function stampSandboxVerdict(dir, verdict) {
    const manifestPath = path_1.default.join(dir, MANIFEST_FILE);
    if (!fs_1.default.existsSync(manifestPath))
        return;
    try {
        const manifest = JSON.parse(fs_1.default.readFileSync(manifestPath, "utf-8"));
        manifest.verdict = verdict;
        fs_1.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }
    catch {
        // noop
    }
}
exports.stampSandboxVerdict = stampSandboxVerdict;
/**
 * Elimina sandboxes más viejos que `maxAgeDays`. Útil para correr al inicio de
 * cada run: mantiene el histórico útil y descarta el ruido.
 */
function gcOldSandboxes(projectRoot, maxAgeDays) {
    const root = path_1.default.join(projectRoot, SANDBOX_ROOT);
    if (!fs_1.default.existsSync(root))
        return { removed: [], kept: 0 };
    const threshold = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const removed = [];
    let kept = 0;
    for (const entry of fs_1.default.readdirSync(root)) {
        const full = path_1.default.join(root, entry);
        let stat;
        try {
            stat = fs_1.default.statSync(full);
        }
        catch {
            continue;
        }
        if (!stat.isDirectory())
            continue;
        if (stat.mtimeMs < threshold) {
            try {
                fs_1.default.rmSync(full, { recursive: true, force: true });
                removed.push(entry);
            }
            catch {
                // si no se puede, seguimos
            }
        }
        else {
            kept++;
        }
    }
    return { removed, kept };
}
exports.gcOldSandboxes = gcOldSandboxes;
