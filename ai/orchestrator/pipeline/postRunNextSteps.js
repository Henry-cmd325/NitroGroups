"use strict";
/**
 * Tras un deploy exitoso del orquestador: checklist concreto para corroborar
 * cambios en máquina (build, API, secretos) + pistas desde contrato y requisitos.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printPostRunNextSteps = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function safeReadJson(p) {
    try {
        return JSON.parse(fs_1.default.readFileSync(p, "utf-8"));
    }
    catch (_a) {
        return null;
    }
}
function gatherRequirementHints(feature, reqDir) {
    const hints = new Set();
    const fl = feature.toLowerCase();
    if (!fs_1.default.existsSync(reqDir))
        return [];
    for (const fileName of fs_1.default.readdirSync(reqDir)) {
        if (!fileName.endsWith(".md"))
            continue;
        const nl = fileName.toLowerCase();
        let body;
        try {
            body = fs_1.default.readFileSync(path_1.default.join(reqDir, fileName), "utf-8").slice(0, 14000).toLowerCase();
        }
        catch (_a) {
            continue;
        }
        const nameOrBodyRelevant = nl.includes(fl)
            || body.includes(fl)
            || nl.includes("r2")
            || nl.includes("storage")
            || body.includes("cloudflare r2")
            || body.includes("cloudflare");
        if (!nameOrBodyRelevant)
            continue;
        if (body.includes("r2") || body.includes("cloudflare")) {
            hints.add(`R2 / Cloudflare (ai/requirements/${fileName}): bucket + token API S3-compat; credenciales en User Secrets / env del API (no en git); URL pública o firmadas; revisa cliente de upload si sigue en Supabase.`);
        }
        if (body.includes("supabase") && (body.includes("migr") || body.includes("r2") || body.includes("reemplaz"))) {
            hints.add(`Migración almacenamiento: URLs en BD, remotePatterns en next.config si cambia el host de imágenes, SUPABASE_* en UI solo si aplica.`);
        }
    }
    return [...hints];
}
function printPostRunNextSteps(params) {
    const { feature, mode, backendReady, frontendReady, projectRoot } = params;
    const lines = [];
    lines.push("\n=== Pasos siguientes (corroborar en tu máquina) ===");
    if (frontendReady > 0) {
        lines.push("· UI:  cd UI/nitro-groups  →  npm run build   (y/o npm run lint)");
        lines.push(`· Navega la ruta App Router del feature (p. ej. /${feature.toLowerCase()}?… ) con la API levantada y sesión válida.`);
    }
    if (backendReady > 0) {
        lines.push("· API:  dotnet build Services/NitroGroups.Services.Api/NitroGroups.Services.Api.csproj   (detén el proceso si bloquea DLLs en Windows)");
        lines.push("· Prueba los endpoints nuevos con el mismo token que usa el front (Auth).");
    }
    else if (mode === "frontend-only" || mode === "contract-only") {
        lines.push("· Backend no generado en este run: confirma que la API .NET sigue en marcha y que NEXT_PUBLIC_* / proxy del UI apuntan a esa base URL.");
    }
    const contractPath = path_1.default.join(projectRoot, "ai", "contracts", "b2b", `${feature}.contract.json`);
    if (fs_1.default.existsSync(contractPath)) {
        const raw = safeReadJson(contractPath);
        if (raw && typeof raw === "object" && "endpoint" in raw && raw.endpoint) {
            lines.push(`· Contrato B2B: endpoint raíz \`${String(raw.endpoint)}\` — alinea pruebas manuales/postman con eso.`);
        }
        if (raw && typeof raw === "object" && Array.isArray(raw.methods)) {
            for (const m of raw.methods.slice(0, 8)) {
                const h = String((m === null || m === void 0 ? void 0 : m.http) || "").toUpperCase();
                const n = String((m === null || m === void 0 ? void 0 : m.name) || "");
                if (h && n)
                    lines.push(`   → ${h}  (${n})`);
            }
        }
    }
    const reqHints = gatherRequirementHints(feature, path_1.default.join(projectRoot, "ai", "requirements"));
    if (reqHints.length > 0) {
        lines.push("· Requisitos detectados (palabras clave en ai/requirements/):");
        reqHints.forEach(h => lines.push(`   ${h}`));
    }
    lines.push("· Secretos / claves (p. ej. Cloudflare R2): User Secrets del API, variables del host o CI — no commitees valores reales.");
    lines.push("· LLM:  npm run ai providers   — comprueba cadena y modelos si algo falló en generación.");
    lines.push("· Git: revisa diff, ejecuta tests del repo si los tenéis en CI local.");
    console.log(lines.join("\n"));
}
exports.printPostRunNextSteps = printPostRunNextSteps;
