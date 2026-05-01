"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recallErrors = exports.rememberSuccess = exports.rememberError = exports.rememberDecision = exports.recallDecisions = exports.initMemory = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
/**
 * Engram soporta dos runtimes:
 * - Gentleman-Programming/engram (Go): `engram serve` → 7437, GET /health, GET /search?q=…
 *   https://github.com/Gentleman-Programming/engram
 * - engram-memory/engram (Python engram-core): 8100, POST /v1/memories, POST /v1/search
 *   https://github.com/engram-memory/engram
 * Por defecto: stack Go (puerto 7437). Usa engram-core: ENGRAM_URL=http://localhost:8100
 */
const ENGRAM_URL = process.env.ENGRAM_URL || "http://127.0.0.1:7437";
const ENGRAM_NAMESPACE = process.env.ENGRAM_NAMESPACE || "nitrogroups-orchestrator";
/** Filtro opcional en GET /search del runtime Go (query `project=`) */
const ENGRAM_PROJECT = process.env.ENGRAM_PROJECT;
const ENGRAM_BIN = process.env.ENGRAM_BIN;
const ENGRAM_API_KEY = process.env.ENGRAM_API_KEY;
function getEngramBinaryCandidates() {
    const candidates = [
        ENGRAM_BIN,
        "engram",
        path_1.default.join(process.env.USERPROFILE || "", "bin", "engram", "engram.exe")
    ].filter(Boolean);
    return Array.from(new Set(candidates));
}
function runEngramCli(args) {
    for (const bin of getEngramBinaryCandidates()) {
        const result = (0, child_process_1.spawnSync)(bin, args, {
            encoding: "utf-8",
            timeout: 15000
        });
        const stdout = result.stdout || "";
        const stderr = result.stderr || "";
        if (!result.error && result.status === 0) {
            return { ok: true, stdout, stderr };
        }
    }
    return { ok: false, stdout: "", stderr: "Engram CLI no disponible." };
}
function engramRequestHeaders() {
    const h = {
        "Content-Type": "application/json",
        "X-Namespace": ENGRAM_NAMESPACE
    };
    if (ENGRAM_API_KEY) {
        h["X-API-Key"] = ENGRAM_API_KEY;
    }
    return h;
}
/**
 * API engram-core v1: POST /v1/search devuelve un array de
 * { memory: { content, ... }, score, match_type }.
 */
function extractSearchContents(data, limit) {
    if (!Array.isArray(data)) {
        const any = data;
        if (any?.memories)
            return extractSearchContents(any.memories, limit);
        if (any?.results)
            return extractSearchContents(any.results, limit);
        if (any?.items)
            return extractSearchContents(any.items, limit);
        return [];
    }
    const out = [];
    for (const r of data) {
        if (typeof r === "string") {
            out.push(r);
            continue;
        }
        if (r && typeof r === "object") {
            const o = r;
            const c = o.memory?.content ?? o.content ?? o.text ?? o.summary;
            const t = o.memory?.title ?? o.title;
            if (c || t) {
                const line = t && c ? `${t}\n${c}` : String(c || t);
                if (line.trim())
                    out.push(line);
            }
        }
        if (out.length >= limit)
            break;
    }
    return out;
}
function parseSearchOutput(raw) {
    const lines = raw.split(/\r?\n/);
    const contents = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        if (trimmed.startsWith("Found ") || trimmed.startsWith("No memories found"))
            continue;
        if (trimmed.includes("| scope:"))
            continue;
        if (trimmed.startsWith("[") && trimmed.includes("—"))
            continue;
        contents.push(trimmed);
    }
    return contents;
}
/**
 * Verifica si Engram está disponible: binario Go en PATH, o HTTP local (Gentleman 7437 o engram-core 8100).
 */
async function isEngramAvailable() {
    const cliProbe = runEngramCli(["version"]);
    if (cliProbe.ok) {
        return true;
    }
    const headers = {};
    if (ENGRAM_API_KEY) {
        headers["X-API-Key"] = ENGRAM_API_KEY;
    }
    try {
        const r0 = await fetch(`${ENGRAM_URL}/health`, { headers, signal: AbortSignal.timeout(2000) });
        if (r0.ok) {
            return true;
        }
    }
    catch {
        // siguientes
    }
    try {
        const r1 = await fetch(`${ENGRAM_URL}/v1/health`, {
            headers,
            signal: AbortSignal.timeout(2000)
        });
        if (r1.ok) {
            return true;
        }
    }
    catch {
        // no hay servidor
    }
    return false;
}
/**
 * Guarda una memoria en Engram.
 */
async function storeMemory(content, tags = [], metadata = {}) {
    const title = content.slice(0, 80).replace(/\s+/g, " ").trim() || "memory";
    const type = metadata.type || "fact";
    const importance = typeof metadata.importance === "number" && metadata.importance >= 1 && metadata.importance <= 10
        ? metadata.importance
        : 7;
    // Gentleman-Programming/engram: CLI hacia SQLite (no exige engram serve).
    const cliStore = runEngramCli(["save", title, content]);
    if (cliStore.ok) {
        return true;
    }
    // engram-core (Python): POST /v1/memories
    try {
        const res = await fetch(`${ENGRAM_URL}/v1/memories`, {
            method: "POST",
            headers: engramRequestHeaders(),
            body: JSON.stringify({
                content,
                type,
                importance,
                tags,
                namespace: ENGRAM_NAMESPACE,
                metadata: { ...metadata, tags, timestamp: new Date().toISOString() }
            }),
            signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
            return true;
        }
    }
    catch {
        // fallback
    }
    try {
        const res = await fetch(`${ENGRAM_URL}/api/memories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content,
                namespace: ENGRAM_NAMESPACE,
                metadata: { ...metadata, tags, timestamp: new Date().toISOString() }
            }),
            signal: AbortSignal.timeout(5000)
        });
        if (res.ok)
            return true;
    }
    catch {
        // continue
    }
    try {
        const res = await fetch(`${ENGRAM_URL}/store`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                content,
                category: metadata.type || "note",
                tags,
                scope: "project"
            }),
            signal: AbortSignal.timeout(5000)
        });
        return res.ok;
    }
    catch {
        return false;
    }
}
/**
 * Busca memorias relevantes en Engram.
 */
async function searchMemories(query, limit = 5) {
    const cliSearch = runEngramCli(["search", query]);
    if (cliSearch.ok) {
        return parseSearchOutput(cliSearch.stdout).slice(0, limit);
    }
    // Gentleman-Programming/engram: GET /search?q=…&limit= (JSON: lista de observaciones)
    try {
        const base = ENGRAM_URL.replace(/\/$/, "");
        const sp = new URLSearchParams({ q: query, limit: String(Math.min(100, limit)) });
        if (ENGRAM_PROJECT) {
            sp.set("project", ENGRAM_PROJECT);
        }
        const res = await fetch(`${base}/search?${sp.toString()}`, { method: "GET", signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const data = await res.json();
            return extractSearchContents(data, limit);
        }
    }
    catch {
        // fallback
    }
    // engram-core (Python): POST /v1/search
    try {
        const res = await fetch(`${ENGRAM_URL}/v1/search`, {
            method: "POST",
            headers: engramRequestHeaders(),
            body: JSON.stringify({
                query,
                limit,
                namespace: ENGRAM_NAMESPACE,
                semantic: false
            }),
            signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
            const data = await res.json();
            return extractSearchContents(data, limit);
        }
    }
    catch {
        // fallback
    }
    try {
        const res = await fetch(`${ENGRAM_URL}/api/memories/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                namespace: ENGRAM_NAMESPACE,
                limit
            }),
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) {
            return [];
        }
        const data = await res.json();
        return extractSearchContents(data.memories || data.results, limit);
    }
    catch {
        // continue
    }
    try {
        const res = await fetch(`${ENGRAM_URL}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit }),
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) {
            return [];
        }
        const data = await res.json();
        return extractSearchContents(data.memories || data.results || data.items, limit);
    }
    catch {
        return [];
    }
}
// ═══════════════════════════════════════════════════════
// CAPA PÚBLICA — Interfaz para el Orquestador
// ═══════════════════════════════════════════════════════
/**
 * Inicializa la conexión con Engram. Si no está disponible, usa fallback local.
 */
async function initMemory() {
    const available = await isEngramAvailable();
    if (available) {
        console.log("🧠 Engram conectado — Memoria persistente activa.");
        return 'engram';
    }
    else {
        console.warn("⚠️  Engram no disponible. Usando memoria local (ai/memory/). Instala Engram para memoria inteligente.");
        return 'local';
    }
}
exports.initMemory = initMemory;
/**
 * Recuerda decisiones pasadas para un feature.
 * Busca en Engram o en el fallback local.
 */
async function recallDecisions(feature) {
    const available = await isEngramAvailable();
    if (available) {
        const primary = await searchMemories(`decisiones arquitectónicas para ${feature} en NitroGroups`);
        if (primary.length > 0)
            return primary;
        const fallback = await searchMemories(feature, 12);
        return fallback.filter(item => item.toLowerCase().includes(feature.toLowerCase()) ||
            item.toLowerCase().includes("[feature:"));
    }
    // Fallback: leer del archivo local
    const localPath = path_1.default.join(__dirname, "../memory/decisions.json");
    if (!fs_1.default.existsSync(localPath))
        return [];
    try {
        const data = JSON.parse(fs_1.default.readFileSync(localPath, "utf-8"));
        return data
            .filter(d => d.feature === feature || d.tags?.includes(feature))
            .map(d => d.content);
    }
    catch {
        return [];
    }
}
exports.recallDecisions = recallDecisions;
/**
 * Guarda una decisión arquitectónica para que persista entre sesiones.
 */
async function rememberDecision(feature, decision, tags = []) {
    const content = `[Feature: ${feature}] ${decision}`;
    const allTags = [feature, "decision", ...tags];
    const available = await isEngramAvailable();
    if (available) {
        await storeMemory(content, allTags, { feature, type: "decision" });
    }
    // Siempre guardar en local como backup
    const localDir = path_1.default.join(__dirname, "../memory");
    fs_1.default.mkdirSync(localDir, { recursive: true });
    const localPath = path_1.default.join(localDir, "decisions.json");
    const existing = fs_1.default.existsSync(localPath) ? JSON.parse(fs_1.default.readFileSync(localPath, "utf-8")) : [];
    existing.push({ feature, content, tags: allTags, timestamp: new Date().toISOString() });
    fs_1.default.writeFileSync(localPath, JSON.stringify(existing, null, 2));
}
exports.rememberDecision = rememberDecision;
/**
 * Registra un error de generación para aprender de él.
 */
async function rememberError(feature, error, context) {
    const content = `[ERROR en ${feature}] ${error} | Contexto: ${context}`;
    const available = await isEngramAvailable();
    if (available) {
        await storeMemory(content, [feature, "error", "learning"], { feature, type: "error" });
    }
    const localDir = path_1.default.join(__dirname, "../memory");
    fs_1.default.mkdirSync(localDir, { recursive: true });
    const localPath = path_1.default.join(localDir, "errors.json");
    const existing = fs_1.default.existsSync(localPath) ? JSON.parse(fs_1.default.readFileSync(localPath, "utf-8")) : [];
    existing.push({ feature, error, context, timestamp: new Date().toISOString() });
    fs_1.default.writeFileSync(localPath, JSON.stringify(existing, null, 2));
}
exports.rememberError = rememberError;
/**
 * Registra una generación exitosa como patrón positivo.
 */
async function rememberSuccess(feature, summary, filesCount) {
    const content = `[ÉXITO en ${feature}] ${summary} — ${filesCount} archivos generados.`;
    const available = await isEngramAvailable();
    if (available) {
        await storeMemory(content, [feature, "success", "pattern"], { feature, type: "success", filesCount });
    }
    const localDir = path_1.default.join(__dirname, "../memory");
    fs_1.default.mkdirSync(localDir, { recursive: true });
    const localPath = path_1.default.join(localDir, "successes.json");
    const existing = fs_1.default.existsSync(localPath) ? JSON.parse(fs_1.default.readFileSync(localPath, "utf-8")) : [];
    existing.push({ feature, summary, filesCount, timestamp: new Date().toISOString() });
    fs_1.default.writeFileSync(localPath, JSON.stringify(existing, null, 2));
}
exports.rememberSuccess = rememberSuccess;
/**
 * Obtiene errores pasados para inyectarlos como contexto en los prompts.
 */
async function recallErrors(feature) {
    const available = await isEngramAvailable();
    if (available) {
        const primary = await searchMemories(`errores de generación en ${feature}`);
        if (primary.length > 0)
            return primary;
        const fallback = await searchMemories(feature, 12);
        return fallback.filter(item => item.toLowerCase().includes(feature.toLowerCase()) &&
            (item.toLowerCase().includes("error") || item.toLowerCase().includes("fallo")));
    }
    const localPath = path_1.default.join(__dirname, "../memory/errors.json");
    if (!fs_1.default.existsSync(localPath))
        return [];
    try {
        const data = JSON.parse(fs_1.default.readFileSync(localPath, "utf-8"));
        return data.filter(d => d.feature === feature).map(d => `${d.error} (${d.context})`);
    }
    catch {
        return [];
    }
}
exports.recallErrors = recallErrors;
