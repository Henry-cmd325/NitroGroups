/**
 * Digest de errores pasados para inyectar como "lecciones aprendidas" en los
 * prompts LLM.
 *
 * Objetivo: cerrar el loop de memoria. Engram y `errors.json` guardan todos
 * los errores del orquestador, pero sin una forma compacta de re-inyectarlos
 * al prompt terminan siendo solo un archivo append-only sin efecto real.
 *
 * Estrategia:
 *  1) Lee ai/memory/errors.json (fuente de verdad local, independiente de
 *     Engram esté corriendo o no).
 *  2) Normaliza mensajes (quita paths absolutos, números de línea, hashes).
 *  3) Agrupa por huella (error normalizado + feature).
 *  4) Rankea por: mismo feature > otros features, reciente > antiguo,
 *     frecuencia.
 *  5) Devuelve top N, cada uno con mensaje compacto + hint de corrección
 *     si el patrón está en el catálogo de heurísticas.
 */

import fs from "fs";
import path from "path";

export interface ErrorEntry {
    feature: string;
    error: string;
    context: string;
    timestamp: string;
}

export interface DigestedLesson {
    pattern: string;        // error normalizado, corto
    layer: "backend" | "frontend" | "contract" | "build" | "unknown";
    count: number;
    lastSeen: string;       // ISO
    hint?: string;          // corrección sugerida si es un patrón conocido
}

const ERRORS_PATH = path.resolve(__dirname, "errors.json");

/**
 * Lee y devuelve todos los errores registrados. Si el archivo no existe o
 * está corrupto, devuelve lista vacía (fail-safe para no romper pipelines).
 */
export function loadErrors(): ErrorEntry[] {
    if (!fs.existsSync(ERRORS_PATH)) return [];
    try {
        const raw = fs.readFileSync(ERRORS_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function normalizeMessage(msg: string): string {
    return msg
        .replace(/[A-Z]:[\\\/][^\s)"']+/g, "<path>")     // Windows absolute paths
        .replace(/\/[^\s)"']*\.(cs|ts|tsx|json)\b/g, "<path>") // Unix-ish paths
        .replace(/\(\d+,\d+\)/g, "")                    // line:col
        .replace(/\s{2,}/g, " ")
        .trim();
}

function classifyLayer(err: string, ctx: string): DigestedLesson["layer"] {
    const blob = `${err} ${ctx}`.toLowerCase();
    if (blob.includes(".cs") || blob.includes("dotnet") || blob.includes("cs0") || blob.includes(".csproj")) return "backend";
    if (blob.includes(".tsx") || blob.includes(".ts") || blob.includes("typescript") || blob.includes("ts2")) return "frontend";
    if (blob.includes("contract") || blob.includes("b2b")) return "contract";
    if (blob.includes("build") || blob.includes("quality gate")) return "build";
    return "unknown";
}

/** Catálogo de patrones conocidos → hint de corrección. Compacto a propósito. */
const HINTS: { match: RegExp; hint: string }[] = [
    { match: /has no exported member '(\w+)'/i, hint: "Si el componente usa `export default`, importa como default; si es named, usa `import { X }`. El normalizer corrige esto, pero gasta tokens." },
    { match: /no default export/i, hint: "Asegura `export default <ComponentName>` en el archivo si se importa como default." },
    { match: /CS0246:.*not found/i, hint: "Verifica los `using` en el archivo .cs y el namespace. El módulo puede necesitar `using NitroGroups.Shared.Contracts;` para Result<T>." },
    { match: /CS0234:.*does not exist in/i, hint: "El namespace indicado no existe. Revisa el path de la carpeta y el `.csproj`." },
    { match: /B2B_TYPE_MISMATCH.*iso-date/i, hint: "Campos con `format: 'iso-date'` deben ser `DateTimeOffset` en C#, NO `string`." },
    { match: /B2B_TYPE_MISMATCH.*uuid/i, hint: "Campos con `format: 'uuid'` deben ser `Guid` en C#." },
    { match: /Import fuera de allowlist/i, hint: "Solo se permiten imports de la allowlist del prompt. `date-fns`, `react-icons`, `moment`, etc. están prohibidos." },
    { match: /rate-limit/i, hint: "No es error del orquestador; es el proveedor LLM. Otro retry o provider distinto resuelve." },
    {
        match: /only offset 0 \(UTC\) is supported|Cannot write DateTimeOffset with Offset=/i,
        hint: "Npgsql exige UTC al escribir timestamptz: tras parse ISO usa .ToUniversalTime() en el handler o HasConversion en EF para StartAt/EndAt."
    },
    {
        match: /DbUpdateException.*DateTimeOffset|DateTimeOffset.*PostgreSQL/i,
        hint: "Revisa persistencia de instantes: normalizar a UTC antes de SaveChanges (mismo hint que offset no UTC)."
    }
];

function matchHint(normalized: string): string | undefined {
    for (const h of HINTS) {
        if (h.match.test(normalized)) return h.hint;
    }
    return undefined;
}

/**
 * Devuelve las lecciones más relevantes para un feature. Prioriza errores
 * del mismo feature y los más recientes. El tamaño final del digest está
 * acotado para no inflar el prompt.
 */
export function digestLessons(options: {
    feature: string;
    layer?: DigestedLesson["layer"];
    limit?: number;
}): DigestedLesson[] {
    const limit = options.limit ?? 6;
    const all = loadErrors();
    if (all.length === 0) return [];

    // Penalizamos errores muy antiguos (>60 días) para que el ruido histórico
    // no tape las lecciones actuales.
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

    type Bucket = {
        pattern: string;
        entries: ErrorEntry[];
        layer: DigestedLesson["layer"];
    };
    const buckets = new Map<string, Bucket>();

    for (const entry of all) {
        if (!entry?.error) continue;
        const ts = Date.parse(entry.timestamp || "");
        if (Number.isFinite(ts) && ts < sixtyDaysAgo) continue;

        const normalized = normalizeMessage(entry.error);
        const layer = classifyLayer(entry.error, entry.context || "");
        const key = `${layer}::${normalized.slice(0, 200)}`;

        if (options.layer && options.layer !== layer) continue;

        const bucket = buckets.get(key) || { pattern: normalized, entries: [], layer };
        bucket.entries.push(entry);
        buckets.set(key, bucket);
    }

    const lessons: DigestedLesson[] = [];
    for (const bucket of buckets.values()) {
        const sorted = bucket.entries.slice().sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
        const sameFeature = sorted.filter(e => e.feature === options.feature).length;
        lessons.push({
            pattern: bucket.pattern,
            layer: bucket.layer,
            count: sorted.length,
            lastSeen: sorted[0]?.timestamp || "",
            hint: matchHint(bucket.pattern),
            // Para orden de ranking, inflamos count cuando es del mismo feature.
            // Guardamos esto en pattern-meta implícitamente al ordenar abajo.
            ...(sameFeature > 0 ? { count: sorted.length + sameFeature * 2 } : {})
        });
    }

    lessons.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return Date.parse(b.lastSeen || "") - Date.parse(a.lastSeen || "");
    });

    return lessons.slice(0, limit);
}

/**
 * Formatea las lecciones como bloque markdown para inyectar al prompt.
 * Devuelve string vacío si no hay nada relevante.
 */
export function formatLessonsForPrompt(lessons: DigestedLesson[]): string {
    if (lessons.length === 0) return "";
    const lines: string[] = [
        "",
        "=== LECCIONES DE ERRORES PASADOS (NO REPETIR) ===",
    ];
    for (const l of lessons) {
        const title = `- [${l.layer}] ${l.pattern.substring(0, 180)}${l.pattern.length > 180 ? "…" : ""} (visto ${l.count}x)`;
        lines.push(title);
        if (l.hint) lines.push(`  └─ hint: ${l.hint}`);
    }
    return lines.join("\n");
}

const MAX_RECALL_ITEMS = 12;
const MAX_RECALL_CHARS = 480;

/**
 * Formatea textos devueltos por `recallErrors` (Engram / búsqueda) para inyectarlos en el prompt.
 * Evita duplicar líneas ya cubiertas por el digest local (`dedupeHaystackLower` = markdown del digest en minúsculas).
 */
export function formatRecalledExperiencesForPrompt(
    recalled: string[],
    dedupeHaystackLower: string
): { block: string; usedCount: number } {
    if (!Array.isArray(recalled) || recalled.length === 0) {
        return { block: "", usedCount: 0 };
    }
    const hay = dedupeHaystackLower || "";
    const seen = new Set<string>();
    const bullets: string[] = [];

    for (const raw of recalled) {
        const oneLine = String(raw).replace(/\s+/g, " ").trim();
        if (!oneLine) continue;
        const clipped =
            oneLine.length > MAX_RECALL_CHARS ? oneLine.slice(0, MAX_RECALL_CHARS) + "…" : oneLine;
        const low = clipped.toLowerCase();
        const fp = low.slice(0, 96);
        if (seen.has(fp)) continue;
        seen.add(fp);
        if (hay.length > 80 && low.length > 40 && hay.includes(low.slice(0, Math.min(72, low.length)))) {
            continue;
        }
        bullets.push(clipped);
        if (bullets.length >= MAX_RECALL_ITEMS) break;
    }

    if (bullets.length === 0) {
        return { block: "", usedCount: 0 };
    }

    const block = [
        "",
        "=== EXPERIENCIA RECUPERADA (memoria semántica / Engram — prioriza no repetir) ===",
        ...bullets.map(b => `- ${b}`)
    ].join("\n");

    return { block, usedCount: bullets.length };
}
