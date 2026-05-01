import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });
import { generateService } from "./tasks/generateService";
import { buildPatterns } from "./tasks/buildPatterns";
import { ExitCodes, verdictToExitCode } from "./cli/exitCodes";
import { warnIfEnvInGitRepo } from "./cli/envGuard";
import { resolveRequirementFilePath } from "./utils/requirementFilePath";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(`
╔══════════════════════════════════════════════╗
║       ORQUESTADOR NITROGROUPS V8             ║
╚══════════════════════════════════════════════╝

Nota (npm): los flags del orquestador (--file, --req, --mode, …) deben ir
después de un doble guion, o npm los interpreta como configuración suya y no
llegan al script. Ejemplo:
  npm run ai -- requirement-workshop groupMedia --file=groupMedia.md

Comandos disponibles:

  npm run ai generate-service <domain> [--force] [--preview] [--example=<domain>]
    → Genera un servicio frontend aislado.

  npm run ai generate-feature <domain> [--update-hash] [--dry-run]
                                       [--mode=full-stack|frontend-only|contract-only]
    → Genera feature Full-Stack (Backend + Frontend) desde contrato B2B.
    → --mode=full-stack (def.): Backend+Frontend.
    → --mode=frontend-only: Solo UI (útil si el backend ya está listo).
    → --mode=contract-only: Solo genera/valida el contrato, sin tocar código.
    → --dry-run: simula el run sin escribir archivos. Útil para CI.
    → Exit codes: 0 real · 2 partial · 3 stub · 4 failed · 5 aborted.

  npm run ai generate-contract <Entity> [--feature=<name>] [--module=<Module>]
                                        [--op=list|get-by-id|create|update|delete] [--force] [--dry-run]
    → Deriva el contrato B2B directamente desde la entidad C# del dominio,
      alineando tipos (long/int/Guid/DateTimeOffset/decimal) y calculando
      entityHash automáticamente. Elimina las adivinanzas en el contrato.

  npm run ai -- requirement-workshop <feature> --file=groupAvailability.md
  npm run ai -- requirement-workshop <feature> --req="texto"
    → TALLER: analiza requisito, pregunta en consola, genera contrato B2B
      y aplica **reconciliación** (2.ª pasada) con requisito + Q&A.
      --file= con solo el nombre de archivo se busca en ai/requirements/.
      También: --file=ruta/relativa.md o ruta absoluta. Requisito: --file o --req.
      Luego: generate-feature. Alias: workshop. [--force] si ya existe el contrato.

  npm run ai -- reconcile-contract <feature> --file=groupMedia.md [--qa-file=qa.txt] [--dry-run]
    → Segunda pasada LLM: alinea un contrato ya existente (ai/contracts/b2b) con
      el requisito y, si indicas, un archivo de Q&A. Útil si el taller generó
      mimbres pero no criterio de producto. --qa-file: mismo criterio de ruta
      que --file (nombre solo → busca bajo ai/requirements/).

  npm run ai clean-feature <feature> [--dry-run] [--force]
    → Elimina una feature del árbol: UseCases + Endpoints + features/<f> +
      app/<f>/page.tsx + contrato B2B. Útil tras un run fallido o para
      reiniciar la feature desde cero.

  npm run ai build-patterns
    → Extrae patrones del repositorio para alimentar los prompts.

  npm run ai providers
    → Muestra la cadena de proveedores LLM activa (Groq → Cerebras → Gemini → Ollama).
`);
    process.exit(ExitCodes.CLI_USAGE);
}

const task = args[0];
const input = args[1]; // Puede ser un flag o el input

const options: any = { force: false, preview: false, updateHash: false, mode: "full-stack", dryRun: false, operation: "list" };
for (const arg of args) {
    if (arg === "--force") options.force = true;
    if (arg === "--preview") options.preview = true;
    if (arg === "--dry-run") options.dryRun = true;
    if (arg === "--update-hash") options.updateHash = true;
    if (arg.startsWith("--example=")) options.example = arg.split("=")[1];
    if (arg.startsWith("--mode=")) options.mode = arg.split("=")[1];
    if (arg.startsWith("--feature=")) options.feature = arg.split("=")[1];
    if (arg.startsWith("--module=")) options.module = arg.split("=")[1];
    if (arg.startsWith("--op=")) options.operation = arg.split("=")[1];
    if (arg.startsWith("--file=")) options.requirementFile = arg.slice("--file=".length);
    if (arg.startsWith("--req=")) options.requirementReq = arg.slice("--req=".length);
    if (arg.startsWith("--qa-file=")) options.qaFile = arg.slice("--qa-file=".length);
}

function log(data: any) {
    if (!fs.existsSync("ai/logs")) fs.mkdirSync("ai/logs", { recursive: true });
    fs.appendFileSync("ai/logs/history.json", JSON.stringify(data) + "\n");
}

async function run(): Promise<number> {
    console.log("===== ORQUESTADOR NITROGROUPS V8 =====\n");
    warnIfEnvInGitRepo(__dirname);

    if (task === "generate-service") {
        if (!input || input.startsWith("--")) {
            console.error("❌ Faltan argumentos. Uso: npm run ai generate-service <feature>");
            return ExitCodes.CLI_USAGE;
        }
        await generateService(input, options);
        return ExitCodes.OK;
    }

    if (task === "generate-feature") {
        if (!input || input.startsWith("--")) {
            console.error("❌ Faltan argumentos. Uso: npm run ai generate-feature <domain> [--dry-run]");
            return ExitCodes.CLI_USAGE;
        }
        const { generateFeature } = await import("./tasks/generateFeature");
        const { parseMode } = await import("./orchestrator/pipeline/modes");
        const result = await generateFeature(input, {
            updateHash: options.updateHash,
            mode: parseMode(options.mode),
            dryRun: options.dryRun
        });
        return result ? verdictToExitCode(result.verdict) : ExitCodes.ABORTED;
    }

    if (task === "clean-feature") {
        if (!input || input.startsWith("--")) {
            console.error("❌ Faltan argumentos. Uso: npm run ai clean-feature <feature> [--dry-run] [--force]");
            return ExitCodes.CLI_USAGE;
        }
        const { cleanFeature } = await import("./tasks/cleanFeature");
        await cleanFeature({ feature: input, dryRun: options.dryRun, force: options.force });
        return ExitCodes.OK;
    }

    if (task === "requirement-workshop" || task === "workshop") {
        if (!input || input.startsWith("--")) {
            console.error(
                "❌ Uso: npm run ai -- requirement-workshop <feature> --file=groupAvailability.md\n" +
                    "   (el -- delante evita que npm se coma --file / --req)\n" +
                    "   o  --file=ai/requirements/...  o  ruta absoluta. Alternativa: --req=\"...\""
            );
            return ExitCodes.CLI_USAGE;
        }
        let body = (options.requirementReq as string) || "";
        if (options.requirementFile) {
            const fp = resolveRequirementFilePath(options.requirementFile, process.cwd());
            if (!fs.existsSync(fp)) {
                console.error(`❌ No existe el archivo: ${fp}`);
                return ExitCodes.CLI_USAGE;
            }
            body = fs.readFileSync(fp, "utf-8");
        }
        if (!body.trim()) {
            console.error("❌ Indica el requisito con --file=... o --req=\"...\".");
            return ExitCodes.CLI_USAGE;
        }
        const { runRequirementWorkshop } = await import("./tasks/requirementWorkshop");
        return await runRequirementWorkshop({
            feature: input,
            requirementBody: body,
            force: options.force
        });
    }

    if (task === "reconcile-contract") {
        if (!input || input.startsWith("--")) {
            console.error(
                "❌ Uso: npm run ai -- reconcile-contract <feature> --file=groupMedia.md  " +
                    " [--qa-file=respuestas-qa.md] [--dry-run]"
            );
            return ExitCodes.CLI_USAGE;
        }
        let body = (options.requirementReq as string) || "";
        if (options.requirementFile) {
            const fp = resolveRequirementFilePath(options.requirementFile, process.cwd());
            if (!fs.existsSync(fp)) {
                console.error(`❌ No existe el archivo: ${fp}`);
                return ExitCodes.CLI_USAGE;
            }
            body = fs.readFileSync(fp, "utf-8");
        }
        if (!body.trim()) {
            console.error("❌ Indica el requisito con --file=... o --req=\"...\".");
            return ExitCodes.CLI_USAGE;
        }
        let qaBody: string | null = null;
        if (options.qaFile) {
            const qfp = resolveRequirementFilePath(options.qaFile, process.cwd());
            if (!fs.existsSync(qfp)) {
                console.error(`❌ No existe el archivo de Q&A: ${qfp}`);
                return ExitCodes.CLI_USAGE;
            }
            qaBody = fs.readFileSync(qfp, "utf-8");
        }
        const { runReconcileContractCli } = await import("./tasks/reconcileContract");
        return await runReconcileContractCli({
            feature: input,
            requirementBody: body,
            qaBody,
            dryRun: options.dryRun
        });
    }

    if (task === "generate-contract") {
        if (!input || input.startsWith("--")) {
            console.error("❌ Faltan argumentos. Uso: npm run ai generate-contract <Entity> [--op=list|get-by-id|create|update|delete]");
            return ExitCodes.CLI_USAGE;
        }
        const validOps = ["list", "get-by-id", "create", "update", "delete"];
        const operation = validOps.includes(options.operation) ? options.operation : "list";
        const { generateContract } = await import("./tasks/generateContract");
        await generateContract({
            entity: input,
            feature: options.feature,
            module: options.module,
            operation: operation as any,
            force: options.force,
            dryRun: options.dryRun
        });
        return ExitCodes.OK;
    }

    if (task === "build-patterns") {
        await buildPatterns();
        return ExitCodes.OK;
    }

    if (task === "providers") {
        const { getConfiguredProviderChain, describeChain } = await import("./providers/registry");
        const chain = getConfiguredProviderChain();
        console.log(`\n🔗 Cadena activa: ${describeChain(chain)}\n`);
        if (chain.length === 0) {
            console.warn("⚠️  Sin proveedores configurados. Edita ai/.env.");
            return ExitCodes.CLI_USAGE;
        }
        for (const provider of chain) {
            const reachable = provider.ping ? await provider.ping() : true;
            const flag = reachable ? "✔️ alcanzable" : "❌ inaccesible";
            console.log(`  • ${provider.name.padEnd(10)} ${flag}  modelos: ${provider.models.join(", ")}`);
        }
        console.log("");
        return ExitCodes.OK;
    }

    console.error(`❌ Tarea '${task}' no reconocida. Ejecuta sin argumentos para ver la ayuda.`);
    return ExitCodes.CLI_USAGE;
}

run()
    .then(exitCode => {
        log({ task, input, options, exitCode, date: new Date().toISOString() });
        process.exit(exitCode);
    })
    .catch(err => {
        console.error("\n💥 Error no controlado en el orquestador:", err?.message || err);
        log({ task, input, options, exitCode: ExitCodes.UNEXPECTED, error: String(err), date: new Date().toISOString() });
        process.exit(ExitCodes.UNEXPECTED);
    });