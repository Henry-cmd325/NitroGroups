/**
 * Tras un deploy exitoso del orquestador: checklist concreto para corroborar
 * cambios en máquina (build, API, secretos) + pistas desde contrato y requisitos.
 */

import fs from "fs";
import path from "path";
import type { OrchestratorMode } from "../types";

function safeReadJson(p: string): unknown | null {
    try {
        return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
        return null;
    }
}

function gatherRequirementHints(feature: string, reqDir: string): string[] {
    const hints = new Set<string>();
    const fl = feature.toLowerCase();
    if (!fs.existsSync(reqDir)) return [];

    for (const fileName of fs.readdirSync(reqDir)) {
        if (!fileName.endsWith(".md")) continue;
        const nl = fileName.toLowerCase();

        let body: string;
        try {
            body = fs.readFileSync(path.join(reqDir, fileName), "utf-8").slice(0, 14_000).toLowerCase();
        } catch {
            continue;
        }

        const nameOrBodyRelevant =
            nl.includes(fl)
            || body.includes(fl)
            || nl.includes("r2")
            || nl.includes("storage")
            || body.includes("cloudflare r2")
            || body.includes("cloudflare");
        if (!nameOrBodyRelevant) continue;

        if (body.includes("r2") || body.includes("cloudflare")) {
            hints.add(
                `R2 / Cloudflare (ai/requirements/${fileName}): bucket + token API S3-compat; credenciales en User Secrets / env del API (no en git); URL pública o firmadas; revisa cliente de upload si sigue en Supabase.`
            );
        }
        if (body.includes("supabase") && (body.includes("migr") || body.includes("r2") || body.includes("reemplaz"))) {
            hints.add(
                `Migración almacenamiento: URLs en BD, remotePatterns en next.config si cambia el host de imágenes, SUPABASE_* en UI solo si aplica.`
            );
        }
    }

    return [...hints];
}

/**
 * Imprime checklist post-run en consola (siempre al menos build + secretos).
 */
export function printPostRunNextSteps(params: {
    feature: string;
    mode: OrchestratorMode;
    backendReady: number;
    frontendReady: number;
    projectRoot: string;
}): void {
    const { feature, mode, backendReady, frontendReady, projectRoot } = params;
    const lines: string[] = [];

    lines.push("\n=== Pasos siguientes (corroborar en tu máquina) ===");

    if (frontendReady > 0) {
        lines.push("· UI:  cd UI/nitro-groups  →  npm run build   (y/o npm run lint)");
        lines.push(`· Navega la ruta App Router del feature (p. ej. /${feature.toLowerCase()}?… ) con la API levantada y sesión válida.`);
    }

    if (backendReady > 0) {
        lines.push(
            "· API:  dotnet build Services/NitroGroups.Services.Api/NitroGroups.Services.Api.csproj   (detén el proceso si bloquea DLLs en Windows)"
        );
        lines.push("· Prueba los endpoints nuevos con el mismo token que usa el front (Auth).");
    } else if (mode === "frontend-only" || mode === "contract-only") {
        lines.push(
            "· Backend no generado en este run: confirma que la API .NET sigue en marcha y que NEXT_PUBLIC_* / proxy del UI apuntan a esa base URL."
        );
    }

    const contractPath = path.join(projectRoot, "ai", "contracts", "b2b", `${feature}.contract.json`);
    if (fs.existsSync(contractPath)) {
        const raw = safeReadJson(contractPath) as
            | { endpoint?: string; methods?: { http?: string; name?: string }[] }
            | null;
        if (raw?.endpoint) {
            lines.push(`· Contrato B2B: endpoint raíz \`${raw.endpoint}\` — alinea pruebas manuales/postman con eso.`);
        }
        if (Array.isArray(raw?.methods)) {
            for (const m of raw.methods.slice(0, 8)) {
                const h = String(m?.http || "").toUpperCase();
                const n = String(m?.name || "");
                if (h && n) lines.push(`   → ${h}  (${n})`);
            }
        }
    }

    const reqHints = gatherRequirementHints(feature, path.join(projectRoot, "ai", "requirements"));
    if (reqHints.length > 0) {
        lines.push("· Requisitos detectados (palabras clave en ai/requirements/):");
        reqHints.forEach(h => lines.push(`   ${h}`));
    }

    lines.push("· Secretos / claves (p. ej. Cloudflare R2): User Secrets del API, variables del host o CI — no commitees valores reales.");
    lines.push("· LLM:  npm run ai providers   — comprueba cadena y modelos si algo falló en generación.");
    lines.push("· Git: revisa diff, ejecuta tests del repo si los tenéis en CI local.");

    console.log(lines.join("\n"));
}
