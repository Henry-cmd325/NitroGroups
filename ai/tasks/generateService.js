"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const paths_1 = require("../config/paths");
const client_1 = require("../client");
const serviceGeneratorPrompt_1 = require("../prompts/serviceGeneratorPrompt");
const validator_1 = require("../validators/validator");
const diffViewer_1 = require("../utils/diffViewer");
const contextExtractor_1 = require("../utils/contextExtractor");
async function generateService(feature, options) {
    try {
        (0, validator_1.validateContractIntegrity)(); // Aborta rápidamente si el contrato está roto
    }
    catch (e) {
        console.error(e.message);
        return;
    }
    const serviceName = `${feature}.service.ts`;
    const dir = path_1.default.join(paths_1.PATHS.frontend, "features", feature, "services");
    fs_1.default.mkdirSync(dir, { recursive: true });
    const filePath = path_1.default.join(dir, serviceName);
    if (fs_1.default.existsSync(filePath) && !options.force && !options.preview) {
        console.log(`⚠️ El servicio ${serviceName} ya existe.`);
        console.log(`Usa --force para sobreescribe o --preview para verlo sin guardar.`);
        return;
    }
    console.log(`\n🤖 Iniciando Generación Guiada de '${feature}'...`);
    let exampleCode = null;
    if (options.example) {
        console.log(`📖 Leyendo contexto estructurado: ${options.example}`);
        exampleCode = (0, contextExtractor_1.extractContext)(options.example);
    }
    const systemPrompt = (0, serviceGeneratorPrompt_1.getServicePrompt)(feature, exampleCode);
    let currentTaskPrompt = `Genera el servicio para ${feature} obedeciendo el contrato.`;
    let attempt = 1;
    const MAX_ATTEMPTS = 3;
    let finalCode = "";
    let usedModel = "gpt-4o";
    while (attempt <= MAX_ATTEMPTS) {
        try {
            console.log(`[🚀 Generación] Intento ${attempt}/${MAX_ATTEMPTS}...`);
            const generated = await (0, client_1.generateCode)(systemPrompt, currentTaskPrompt, usedModel);
            const validation = (0, validator_1.validateServiceOutput)(generated);
            if (validation.isValid) {
                console.log(`✔️ Código sintáctico válido según contrato.`);
                finalCode = generated;
                break;
            }
            else {
                console.warn(`🛑 FALLO DE CONTRATO: ${validation.error}`);
                currentTaskPrompt = `Error:\n- ${validation.error}\n\nCorrige SOLO eso en el código que devolviste. Devuelve el código completo corregido en un bloque markdown de TypeScript.`;
                attempt++;
            }
        }
        catch (e) {
            console.error("❌ Fallo en peticion LLM:", e.message);
            return;
        }
    }
    if (!finalCode) {
        console.error("❌ Se agotaron los reintentos.");
        fs_1.default.writeFileSync("ai/logs/failed_attempts.json", JSON.stringify({
            feature, lastFailedPrompt: currentTaskPrompt, date: new Date().toISOString()
        }, null, 2));
        return;
    }
    // --- CAPA DE COMPILACIÓN HÍBRIDA (TSC) ---
    console.log("⚙️  Ejecutando verificación de Compilación TS (tsc --noEmit)...");
    const isTempWrite = !fs_1.default.existsSync(filePath); // Si no existía, lo borramos luego si hay aborto
    try {
        // Escribimos tentativo para que TS lo pueda ver
        fs_1.default.writeFileSync(filePath, finalCode);
        try {
            (0, child_process_1.execSync)("npx tsc --noEmit", { stdio: "pipe", cwd: path_1.default.join(process.cwd(), "UI/nitro-groups") });
            console.log("✔️  Compilación estructural lógica perfecta.");
        }
        catch (tscError) {
            const stderr = tscError.stdout ? tscError.stdout.toString() : "";
            const localFileNormalized = filePath.replace(/\\/g, "/"); // normalizar rutas de windows
            const isLocalError = stderr.replace(/\\/g, "/").includes(localFileNormalized) || stderr.includes(serviceName);
            if (isLocalError) {
                console.error(`\n❌ BASURA LÓGICA DETECTADA EN EL CÓDIGO GENERADO:\n${stderr}`);
                if (isTempWrite)
                    fs_1.default.unlinkSync(filePath); // Revertir
                return; // Aborta
            }
            else {
                console.warn(`\n⚠️ ADVERTENCIA: El proyecto tiene errores de TS en otros archivos, pero el generado parece estar libre de culpa. Ignorando error externo.\n`);
            }
        }
    }
    catch (fsError) {
        console.error("Error al escribir archivo temporal:", fsError);
        return;
    }
    if (options.preview) {
        (0, diffViewer_1.showPreview)(finalCode);
        return;
    }
    (0, diffViewer_1.showPreview)(finalCode);
    // Como lo guardamos arriba temporalmente para tsc, debemos removerlo si el usuario lo declina
    const save = await (0, diffViewer_1.confirmAction)(`¿Conservar y asentar permanentemente el archivo generado en ${filePath}?`);
    if (save) {
        console.log(`✅ [GUARDADO EXITOSO] Service en: ${filePath}`);
        // Log de Telemetria de Exitos
        const logPath = "ai/logs/success.json";
        const logData = { feature, model: usedModel, timestamp: new Date().toISOString(), tokens_aprox: finalCode.length / 4, outputPreview: finalCode.substring(0, 50) + "..." };
        const existing = fs_1.default.existsSync(logPath) ? JSON.parse(fs_1.default.readFileSync(logPath, "utf-8")) : [];
        existing.push(logData);
        fs_1.default.writeFileSync(logPath, JSON.stringify(existing, null, 2));
    }
    else {
        console.log("❌ Operación abortada, revirtiendo.");
        if (isTempWrite) {
            fs_1.default.unlinkSync(filePath);
        }
        else {
            // Técnicamente aquí tendríamos que restaurar la versión vieja si hicimos force
            console.warn("Recuerda restaurar tu versión anterior vía git si aplicaste flag --force.");
        }
    }
}
exports.generateService = generateService;
