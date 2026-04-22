import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });
import { PATHS } from "./config/paths";
import { generateService } from "./tasks/generateService";
import { buildPatterns } from "./tasks/buildPatterns";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(`
╔══════════════════════════════════════════════╗
║       ORQUESTADOR NITROGROUPS V8             ║
╚══════════════════════════════════════════════╝

Comandos disponibles:

  npm run ai generate-service <domain> [--force] [--preview] [--example=<domain>]
    → Genera un servicio frontend aislado.

  npm run ai generate-feature <domain> [--update-hash] [--mode=full-stack|frontend-only|contract-only]
    → Genera feature Full-Stack (Backend + Frontend) desde contrato B2B.
    → Sin contrato: inicia fase de Drafting inteligente.
    → Con contrato: ejecuta generación determinista.
    → --update-hash: firma el hash actual de la entidad de dominio.
    → --mode=full-stack (def.): Backend+Frontend.
    → --mode=frontend-only: Solo UI (útil si el backend ya está listo).
    → --mode=contract-only: Solo genera/valida el contrato, sin tocar código.

  npm run ai build-patterns
    → Extrae patrones del repositorio para alimentar los prompts.

  npm run ai providers
    → Muestra la cadena de proveedores LLM activa (Groq → Cerebras → Gemini → Ollama).
`);
    process.exit(1);
}

const task = args[0];
const input = args[1]; // Puede ser un flag o el input

const options: any = { force: false, preview: false, updateHash: false, mode: "full-stack" };
for (const arg of args) {
    if (arg === "--force") options.force = true;
    if (arg === "--preview") options.preview = true;
    if (arg === "--update-hash") options.updateHash = true;
    if (arg.startsWith("--example=")) options.example = arg.split("=")[1];
    if (arg.startsWith("--mode=")) options.mode = arg.split("=")[1];
}

function log(data: any) {
    if (!fs.existsSync("ai/logs")) fs.mkdirSync("ai/logs", { recursive: true });
    fs.appendFileSync("ai/logs/history.json", JSON.stringify(data) + "\n");
}

async function run() {
    console.log("===== ORQUESTADOR NITROGROUPS V8 =====\n");

    if (task === "generate-service") {
        if (!input || input.startsWith("--")) {
            console.error("❌ Faltan argumentos. Uso: npm run ai generate-service <feature>");
            return;
        }
        await generateService(input, options);
    }

    else if (task === "generate-feature") {
        if (!input || input.startsWith("--")) {
            console.error("❌ Faltan argumentos. Uso: npm run ai generate-feature <domain>");
            return;
        }
        const { generateFeature } = await import("./tasks/generateFeature");
        const { parseMode } = await import("./orchestrator/pipeline/modes");
        await generateFeature(input, { updateHash: options.updateHash, mode: parseMode(options.mode) });
    }

    else if (task === "build-patterns") {
        await buildPatterns();
    }

    else if (task === "providers") {
        const { getConfiguredProviderChain, describeChain } = await import("./providers/registry");
        const chain = getConfiguredProviderChain();
        console.log(`\n🔗 Cadena activa: ${describeChain(chain)}\n`);
        if (chain.length === 0) {
            console.warn("⚠️  Sin proveedores configurados. Edita ai/.env.");
            return;
        }
        for (const provider of chain) {
            const reachable = provider.ping ? await provider.ping() : true;
            const flag = reachable ? "✔️ alcanzable" : "❌ inaccesible";
            console.log(`  • ${provider.name.padEnd(10)} ${flag}  modelos: ${provider.models.join(", ")}`);
        }
        console.log("");
    }

    else {
        console.error(`❌ Tarea '${task}' no reconocida. Ejecuta sin argumentos para ver la ayuda.`);
    }

    log({ task, input, options, date: new Date().toISOString() });
}

run();