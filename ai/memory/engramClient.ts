import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ENGRAM_URL = process.env.ENGRAM_URL || "http://localhost:7437";
const ENGRAM_NAMESPACE = "nitrogroups-orchestrator";
const ENGRAM_BIN = process.env.ENGRAM_BIN;

interface EngramMemory {
    id?: string;
    content: string;
    metadata?: Record<string, any>;
    namespace?: string;
}

function getEngramBinaryCandidates(): string[] {
    const candidates = [
        ENGRAM_BIN,
        "engram",
        path.join(process.env.USERPROFILE || "", "bin", "engram", "engram.exe")
    ].filter(Boolean) as string[];
    return Array.from(new Set(candidates));
}

function runEngramCli(args: string[]): { ok: boolean; stdout: string; stderr: string } {
    for (const bin of getEngramBinaryCandidates()) {
        const result = spawnSync(bin, args, {
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

function parseSearchOutput(raw: string): string[] {
    const lines = raw.split(/\r?\n/);
    const contents: string[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("Found ") || trimmed.startsWith("No memories found")) continue;
        if (trimmed.includes("| scope:")) continue;
        if (trimmed.startsWith("[") && trimmed.includes("—")) continue;
        contents.push(trimmed);
    }
    return contents;
}

/**
 * Verifica si Engram está corriendo localmente.
 */
async function isEngramAvailable(): Promise<boolean> {
    const cliProbe = runEngramCli(["version"]);
    if (cliProbe.ok) return true;

    try {
        const res = await fetch(`${ENGRAM_URL}/health`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Guarda una memoria en Engram.
 */
async function storeMemory(content: string, tags: string[] = [], metadata: Record<string, any> = {}): Promise<boolean> {
    const title = content.slice(0, 80).replace(/\s+/g, " ").trim() || "memory";
    const cliStore = runEngramCli(["save", title, content]);
    if (cliStore.ok) return true;

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
        if (res.ok) return true;
    } catch {
        // continue with modern endpoint fallback
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
    } catch {
        return false;
    }
}

/**
 * Busca memorias relevantes en Engram.
 */
async function searchMemories(query: string, limit: number = 5): Promise<string[]> {
    const cliSearch = runEngramCli(["search", query]);
    if (cliSearch.ok) {
        return parseSearchOutput(cliSearch.stdout).slice(0, limit);
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
        if (!res.ok) return [];
        const data = await res.json() as any;
        return (data.memories || data.results || []).map((m: any) => m.content || m.text || "");
    } catch {
        // continue with modern endpoint fallback
    }

    try {
        const res = await fetch(`${ENGRAM_URL}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, limit }),
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return [];
        const data = await res.json() as any;
        return (data.memories || data.results || data.items || []).map((m: any) => m.content || m.text || m.summary || "");
    } catch {
        return [];
    }
}

// ═══════════════════════════════════════════════════════
// CAPA PÚBLICA — Interfaz para el Orquestador
// ═══════════════════════════════════════════════════════

/**
 * Inicializa la conexión con Engram. Si no está disponible, usa fallback local.
 */
export async function initMemory(): Promise<'engram' | 'local'> {
    const available = await isEngramAvailable();
    if (available) {
        console.log("🧠 Engram conectado — Memoria persistente activa.");
        return 'engram';
    } else {
        console.warn("⚠️  Engram no disponible. Usando memoria local (ai/memory/). Instala Engram para memoria inteligente.");
        return 'local';
    }
}

/**
 * Recuerda decisiones pasadas para un feature. 
 * Busca en Engram o en el fallback local.
 */
export async function recallDecisions(feature: string): Promise<string[]> {
    const available = await isEngramAvailable();

    if (available) {
        const primary = await searchMemories(`decisiones arquitectónicas para ${feature} en NitroGroups`);
        if (primary.length > 0) return primary;
        const fallback = await searchMemories(feature, 12);
        return fallback.filter(item =>
            item.toLowerCase().includes(feature.toLowerCase()) ||
            item.toLowerCase().includes("[feature:")
        );
    }

    // Fallback: leer del archivo local
    const localPath = path.join(__dirname, "../memory/decisions.json");
    if (!fs.existsSync(localPath)) return [];

    try {
        const data = JSON.parse(fs.readFileSync(localPath, "utf-8")) as any[];
        return data
            .filter(d => d.feature === feature || d.tags?.includes(feature))
            .map(d => d.content);
    } catch {
        return [];
    }
}

/**
 * Guarda una decisión arquitectónica para que persista entre sesiones.
 */
export async function rememberDecision(feature: string, decision: string, tags: string[] = []): Promise<void> {
    const content = `[Feature: ${feature}] ${decision}`;
    const allTags = [feature, "decision", ...tags];

    const available = await isEngramAvailable();

    if (available) {
        await storeMemory(content, allTags, { feature, type: "decision" });
    }

    // Siempre guardar en local como backup
    const localDir = path.join(__dirname, "../memory");
    fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, "decisions.json");
    const existing = fs.existsSync(localPath) ? JSON.parse(fs.readFileSync(localPath, "utf-8")) : [];
    existing.push({ feature, content, tags: allTags, timestamp: new Date().toISOString() });
    fs.writeFileSync(localPath, JSON.stringify(existing, null, 2));
}

/**
 * Registra un error de generación para aprender de él.
 */
export async function rememberError(feature: string, error: string, context: string): Promise<void> {
    const content = `[ERROR en ${feature}] ${error} | Contexto: ${context}`;

    const available = await isEngramAvailable();

    if (available) {
        await storeMemory(content, [feature, "error", "learning"], { feature, type: "error" });
    }

    const localDir = path.join(__dirname, "../memory");
    fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, "errors.json");
    const existing = fs.existsSync(localPath) ? JSON.parse(fs.readFileSync(localPath, "utf-8")) : [];
    existing.push({ feature, error, context, timestamp: new Date().toISOString() });
    fs.writeFileSync(localPath, JSON.stringify(existing, null, 2));
}

/**
 * Registra una generación exitosa como patrón positivo.
 */
export async function rememberSuccess(feature: string, summary: string, filesCount: number): Promise<void> {
    const content = `[ÉXITO en ${feature}] ${summary} — ${filesCount} archivos generados.`;

    const available = await isEngramAvailable();

    if (available) {
        await storeMemory(content, [feature, "success", "pattern"], { feature, type: "success", filesCount });
    }

    const localDir = path.join(__dirname, "../memory");
    fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, "successes.json");
    const existing = fs.existsSync(localPath) ? JSON.parse(fs.readFileSync(localPath, "utf-8")) : [];
    existing.push({ feature, summary, filesCount, timestamp: new Date().toISOString() });
    fs.writeFileSync(localPath, JSON.stringify(existing, null, 2));
}

/**
 * Obtiene errores pasados para inyectarlos como contexto en los prompts.
 */
export async function recallErrors(feature: string): Promise<string[]> {
    const available = await isEngramAvailable();

    if (available) {
        const primary = await searchMemories(`errores de generación en ${feature}`);
        if (primary.length > 0) return primary;
        const fallback = await searchMemories(feature, 12);
        return fallback.filter(item =>
            item.toLowerCase().includes(feature.toLowerCase()) &&
            (item.toLowerCase().includes("error") || item.toLowerCase().includes("fallo"))
        );
    }

    const localPath = path.join(__dirname, "../memory/errors.json");
    if (!fs.existsSync(localPath)) return [];

    try {
        const data = JSON.parse(fs.readFileSync(localPath, "utf-8")) as any[];
        return data.filter(d => d.feature === feature).map(d => `${d.error} (${d.context})`);
    } catch {
        return [];
    }
}
