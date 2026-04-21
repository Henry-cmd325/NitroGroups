import fs from "fs";
import path from "path";

const ENGRAM_URL = process.env.ENGRAM_URL || "http://localhost:7437";
const ENGRAM_NAMESPACE = "nitrogroups-orchestrator";

interface EngramMemory {
    id?: string;
    content: string;
    metadata?: Record<string, any>;
    namespace?: string;
}

/**
 * Verifica si Engram está corriendo localmente.
 */
async function isEngramAvailable(): Promise<boolean> {
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
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Busca memorias relevantes en Engram.
 */
async function searchMemories(query: string, limit: number = 5): Promise<string[]> {
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
        return await searchMemories(`decisiones arquitectónicas para ${feature} en NitroGroups`);
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
        return await searchMemories(`errores de generación en ${feature}`);
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
