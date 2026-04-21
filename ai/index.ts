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

  npm run ai generate-feature <domain> [--update-hash]
    → Genera feature Full-Stack (Backend + Frontend) desde contrato B2B.
    → Sin contrato: inicia fase de Drafting inteligente.
    → Con contrato: ejecuta generación determinista.
    → --update-hash: firma el hash actual de la entidad de dominio.

  npm run ai build-patterns
    → Extrae patrones del repositorio para alimentar los prompts.
`);
    process.exit(1);
}

const task = args[0];
const input = args[1]; // Puede ser un flag o el input

// Parse options
const options: any = { force: false, preview: false, updateHash: false };
for (const arg of args) {
    if (arg === "--force") options.force = true;
    if (arg === "--preview") options.preview = true;
    if (arg === "--update-hash") options.updateHash = true;
    if (arg.startsWith("--example=")) options.example = arg.split("=")[1];
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
        await generateFeature(input, { updateHash: options.updateHash });
    }

    else if (task === "build-patterns") {
        await buildPatterns();
    }

    else {
        console.error(`❌ Tarea '${task}' no reconocida. Ejecuta sin argumentos para ver la ayuda.`);
    }

    log({ task, input, options, date: new Date().toISOString() });
}

run();