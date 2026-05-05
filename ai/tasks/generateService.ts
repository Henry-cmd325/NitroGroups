import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { PATHS } from "../config/paths";
import { generateCode } from "../client";
import { getServicePrompt } from "../prompts/serviceGeneratorPrompt";
import { validateServiceOutput, validateContractIntegrity } from "../validators/validator";
import { confirmAction, showPreview } from "../utils/diffViewer";
import { extractContext } from "../utils/contextExtractor";

interface GenOptions {
    force?: boolean;
    preview?: boolean;
    example?: string;
}

export async function generateService(feature: string, options: GenOptions) {
    try {
        validateContractIntegrity(); // Aborta rápidamente si el contrato está roto
    } catch (e: any) {
        console.error(e.message);
        return;
    }

    const serviceName = `${feature}.service.ts`;
    const dir = path.join(PATHS.frontend, "features", feature, "services");
    fs.mkdirSync(dir, { recursive: true });
    
    const filePath = path.join(dir, serviceName);

    if (fs.existsSync(filePath) && !options.force && !options.preview) {
        console.log(`⚠️ El servicio ${serviceName} ya existe.`);
        console.log(`Usa --force para sobreescribe o --preview para verlo sin guardar.`);
        return;
    }

    console.log(`\n🤖 Iniciando Generación Guiada de '${feature}'...`);
    
    let exampleCode = null;
    if (options.example) {
        console.log(`📖 Leyendo contexto estructurado: ${options.example}`);
        exampleCode = extractContext(options.example);
    }

    const systemPrompt = getServicePrompt(feature, exampleCode);
    let currentTaskPrompt = `Genera el servicio para ${feature} obedeciendo el contrato.`;
    
    let attempt = 1;
    const MAX_ATTEMPTS = 3; 
    let finalCode = "";
    let usedModel = "gpt-4o";

    while (attempt <= MAX_ATTEMPTS) {
        try {
            console.log(`[🚀 Generación] Intento ${attempt}/${MAX_ATTEMPTS}...`);
            const generated = await generateCode(systemPrompt, currentTaskPrompt, usedModel);
            
            const validation = validateServiceOutput(generated);
            
            if (validation.isValid) {
                console.log(`✔️ Código sintáctico válido según contrato.`);
                finalCode = generated;
                break;
            } else {
                console.warn(`🛑 FALLO DE CONTRATO: ${validation.error}`);
                currentTaskPrompt = `Error:\n- ${validation.error}\n\nCorrige SOLO eso en el código que devolviste. Devuelve el código completo corregido en un bloque markdown de TypeScript.`;
                attempt++;
            }
        } catch (e: any) {
            console.error("❌ Fallo en peticion LLM:", e.message);
            return;
        }
    }

    if (!finalCode) {
        console.error("❌ Se agotaron los reintentos.");
        fs.writeFileSync("ai/logs/failed_attempts.json", JSON.stringify({
            feature, lastFailedPrompt: currentTaskPrompt, date: new Date().toISOString()
        }, null, 2));
        return;
    }

    // --- CAPA DE COMPILACIÓN HÍBRIDA (TSC) ---
    console.log("⚙️  Ejecutando verificación de Compilación TS (tsc --noEmit)...");
    const isTempWrite = !fs.existsSync(filePath); // Si no existía, lo borramos luego si hay aborto
    
    try {
        // Escribimos tentativo para que TS lo pueda ver
        fs.writeFileSync(filePath, finalCode); 
        
        try {
            execSync("npx tsc --noEmit", { stdio: "pipe", cwd: path.join(process.cwd(), "UI/nitro-groups") });
            console.log("✔️  Compilación estructural lógica perfecta.");
        } catch (tscError: any) {
            const stderr = tscError.stdout ? tscError.stdout.toString() : "";
            
            const localFileNormalized = filePath.replace(/\\/g, "/"); // normalizar rutas de windows
            const isLocalError = stderr.replace(/\\/g, "/").includes(localFileNormalized) || stderr.includes(serviceName);

            if (isLocalError) {
                console.error(`\n❌ BASURA LÓGICA DETECTADA EN EL CÓDIGO GENERADO:\n${stderr}`);
                if (isTempWrite) fs.unlinkSync(filePath); // Revertir
                return; // Aborta
            } else {
                console.warn(`\n⚠️ ADVERTENCIA: El proyecto tiene errores de TS en otros archivos, pero el generado parece estar libre de culpa. Ignorando error externo.\n`);
            }
        }
    } catch(fsError) {
        console.error("Error al escribir archivo temporal:", fsError);
        return;
    }

    if (options.preview) {
        showPreview(finalCode);
        return;
    }

    showPreview(finalCode);
    
    // Como lo guardamos arriba temporalmente para tsc, debemos removerlo si el usuario lo declina
    const save = await confirmAction(`¿Conservar y asentar permanentemente el archivo generado en ${filePath}?`);
    
    if (save) {
        console.log(`✅ [GUARDADO EXITOSO] Service en: ${filePath}`);
        
        // Log de Telemetria de Exitos
        const logPath = "ai/logs/success.json";
        const logData = { feature, model: usedModel, timestamp: new Date().toISOString(), tokens_aprox: finalCode.length / 4, outputPreview: finalCode.substring(0, 50) + "..." };
        const existing = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf-8")) : [];
        existing.push(logData);
        fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
    } else {
        console.log("❌ Operación abortada, revirtiendo.");
        if (isTempWrite) {
            fs.unlinkSync(filePath);
        } else {
            // Técnicamente aquí tendríamos que restaurar la versión vieja si hicimos force
            console.warn("Recuerda restaurar tu versión anterior vía git si aplicaste flag --force.");
        }
    }
}