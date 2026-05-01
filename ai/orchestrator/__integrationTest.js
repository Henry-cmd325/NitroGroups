"use strict";
/**
 * E2E ligero del orquestador: sin API keys, sin LLM real.
 *
 * - `setGenerateCodeOverride` devuelve string vacío → el pipeline aplica
 *   fallbacks deterministas (igual criterio que el smoke, pero vía
 *   `generateFeature`).
 * - `generateFeature(..., { dryRun: true, mode: "frontend-only" | "full-stack" })` no
 *   escribe al disco. `full-stack` cubre B2B + quality gates (override vacío → fallbacks).
 * - `AUTO_ACCEPT=true` evita confirmaciones en utilidades de diff.
 *
 * Ejecutar desde la raíz del repo: `npm run orchestrator:integration`
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("../client");
const generateFeature_1 = require("../tasks/generateFeature");
let failed = false;
function assert(cond, message) {
    if (cond) {
        console.log(`   ✔️ ${message}`);
    }
    else {
        console.error(`   ❌ ${message}`);
        failed = true;
    }
}
async function main() {
    const contractMarker = path_1.default.join(process.cwd(), "ai", "contracts", "b2b", "groupAvailability.contract.json");
    if (!fs_1.default.existsSync(contractMarker)) {
        console.error("❌ Ejecuta este script desde la raíz del repo (falta ai/contracts/b2b/groupAvailability.contract.json).");
        process.exitCode = 1;
        return;
    }
    const prevAuto = process.env.AUTO_ACCEPT;
    process.env.AUTO_ACCEPT = "true";
    (0, client_1.setGenerateCodeOverride)(async () => "");
    try {
        console.log("\n🧪 Integración: generateFeature (override vacío, dry-run, frontend-only)\n");
        const r1 = await (0, generateFeature_1.generateFeature)("groupAvailability", {
            dryRun: true,
            mode: "frontend-only"
        });
        assert(r1 != null, "[frontend-only] Retorna un resultado (no void por salida intermedia).");
        assert(r1?.verdict === "dry-run", `[frontend-only] verdict es "dry-run" (recibido: ${r1 == null ? "void" : JSON.stringify(r1.verdict)}).`);
        console.log("\n🧪 Integración: generateFeature (override vacío, dry-run, full-stack)\n");
        const r2 = await (0, generateFeature_1.generateFeature)("groupAvailability", {
            dryRun: true,
            mode: "full-stack"
        });
        assert(r2 != null, "[full-stack] Retorna un resultado (no void por salida intermedia).");
        assert(r2?.verdict === "dry-run", `[full-stack] verdict es "dry-run" (recibido: ${r2 == null ? "void" : JSON.stringify(r2.verdict)}).`);
    }
    finally {
        (0, client_1.setGenerateCodeOverride)(null);
        if (prevAuto === undefined) {
            delete process.env.AUTO_ACCEPT;
        }
        else {
            process.env.AUTO_ACCEPT = prevAuto;
        }
    }
    if (failed) {
        process.exitCode = 1;
    }
    else {
        console.log("\n✅ Integración completada.\n");
    }
}
void main().catch(err => {
    console.error("❌ Error inesperado:", err);
    (0, client_1.setGenerateCodeOverride)(null);
    process.exitCode = 1;
});
