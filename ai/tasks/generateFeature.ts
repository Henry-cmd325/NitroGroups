import fs from "fs";
import path from "path";
import { generateCode } from "../client";
import { confirmAction, showPreview } from "../utils/diffViewer";
import { validateB2BCoherence, validateContractVsEntity } from "../validators/b2bValidator";
import { getBackendArchitecturePrompt } from "../prompts/backendArchitecturePrompt";
import { getFrontendArchitecturePrompt } from "../prompts/frontendArchitecturePrompt";
import { extractDomainContext, calculateSemanticHash, runImpactAnalysis, extractDbSchema } from "../utils/contextExtractor";
import { initMemory, recallDecisions, rememberDecision, rememberError, rememberSuccess, recallErrors } from "../memory/engramClient";

interface FileOutput { path: string; content: string; }

function parseMultiFileOutput(raw: string): FileOutput[] {
    const files: FileOutput[] = [];
    const regex = /\[FILE:\s*(.+?)\][\s\S]*?```[\w\-\s]*\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
        files.push({ path: match[1].trim(), content: match[2].trim() });
    }
    return files;
}

function extractJsonFromResponse(raw: string): string | null {
    // Buscar un bloque JSON en la respuesta de la IA
    const jsonMatch = raw.match(/```json\n([\s\S]*?)```/);
    if (jsonMatch) return jsonMatch[1].trim();
    // Intentar parsear toda la respuesta como JSON
    try { JSON.parse(raw); return raw.trim(); } catch { return null; }
}

// ═══════════════════════════════════════════════════════
// FASE A: DISEÑO (DRAFTING INTELIGENTE)
// ═══════════════════════════════════════════════════════

async function runDraftingPhase(feature: string): Promise<boolean> {
    console.log(`\n🧠 ═══ FASE A: DISEÑO INTELIGENTE ═══`);
    console.log(`[📋] No existe contrato B2B para '${feature}'. Iniciando análisis de requerimiento.\n`);

    const memoryType = await initMemory();
    const pastDecisions = await recallDecisions(feature);

    // 1. Cargar contexto real del proyecto
    const dbSchema = extractDbSchema();
    const domainContext = extractDomainContext(feature);

    const draftPrompt = `
    Eres un Arquitecto de Software Senior analizando un requerimiento para el proyecto NitroGroups.
    El usuario pide: "Implementar ${feature}"

${pastDecisions.length > 0 ? `
=== DECISIONES PREVIAS RECORDADAS POR ENGRAM ===
Por favor respeta estas decisiones arquitectónicas previamente tomadas:
${pastDecisions.map(d => `- ${d}`).join('\n')}
` : ""}

Eres un Arquitecto de Software Senior analizando un requerimiento para el proyecto NitroGroups.
El usuario pide: "Implementar ${feature}"

${dbSchema ? `
=== SCHEMA DE BASE DE DATOS DEL PROYECTO ===
Estas son las tablas REALES que ya existen en el proyecto. Úsalas para diseñar el contrato.
${dbSchema}
` : "No se encontró schema de BD."}

${domainContext ? `
=== ENTIDADES DE DOMINIO (.NET) YA EXISTENTES ===
${domainContext}
` : "No hay entidades de dominio previas para este feature."}

TU TRABAJO TIENE 2 PARTES:

PARTE 1 - PREGUNTAS DE NEGOCIO:
Genera entre 3 y 6 preguntas CRÍTICAS que el desarrollador DEBE responder antes de implementar.
Cada pregunta debe tener opciones concretas (no texto libre).
Formato:
[QUESTIONS]
1. ¿Pregunta? → Opciones: A) opción1 | B) opción2 | C) opción3
2. ...
[/QUESTIONS]

PARTE 2 - CONTRATO B2B PROPUESTO:
Basándote en el schema de BD y las entidades existentes, propone un contrato B2B en JSON.
Usa el formato exacto del proyecto con: v, feature, endpoint, scope, businessRules, entityHash, methods (con fields usando type+format), auth.

\`\`\`json
{ ... tu contrato aquí ... }
\`\`\`
`;

    const response = await generateCode("Eres un Arquitecto de Producto y DDD Senior", draftPrompt);

    // Mostrar las preguntas y el contrato propuesto
    console.log("═══════════════════════════════════════");
    console.log(response);
    console.log("═══════════════════════════════════════\n");

    const accept = await confirmAction("¿Deseas guardar este contrato como base? (Podrás editarlo después)");

    if (accept) {
        const jsonStr = extractJsonFromResponse(response);
        if (jsonStr) {
            try {
                const contract = JSON.parse(jsonStr);
                // Asegurar campos obligatorios
                contract.v = contract.v || "1.0.0";
                contract.entityHash = contract.entityHash || "INITIAL_SIGNATURE";
                
                const contractDir = path.join(__dirname, "../contracts/b2b");
                fs.mkdirSync(contractDir, { recursive: true });
                const contractPath = path.join(contractDir, `${feature}.contract.json`);
                fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
                
                await rememberDecision(feature, `Contrato inicial creado. Hash: ${contract.entityHash}. Métodos definidos: ${Object.keys(contract.methods || {}).join(', ')}`);
                
                console.log(`\n✅ Contrato guardado en: ai/contracts/b2b/${feature}.contract.json`);
                console.log(`📝 Edítalo si necesitas ajustar las respuestas del negocio.`);
                console.log(`🔄 Ejecuta de nuevo 'npm run ai generate-feature ${feature}' para generar el código.\n`);
                return true;
            } catch (e) {
                console.error("❌ No se pudo parsear el JSON del contrato. Revisa la salida manualmente.");
                return false;
            }
        } else {
            console.error("❌ La IA no devolvió un bloque JSON válido. Intenta de nuevo.");
            return false;
        }
    }

    console.log("❌ Drafting cancelado.");
    return false;
}

// ═══════════════════════════════════════════════════════
// FASE B: EJECUCIÓN DETERMINISTA
// ═══════════════════════════════════════════════════════

export async function generateFeature(feature: string, options: { updateHash?: boolean } = {}) {
    await initMemory();
    const pastErrors = await recallErrors(feature);
    const pastDecisions = await recallDecisions(feature);

    const contractPath = path.join(__dirname, `../contracts/b2b/${feature}.contract.json`);

    // Si no hay contrato → Fase A: Drafting
    if (!fs.existsSync(contractPath)) {
        await runDraftingPhase(feature);
        return;
    }

    const contractStr = fs.readFileSync(contractPath, "utf-8");
    const contract = JSON.parse(contractStr);

    console.log(`\n🤖 ═══ FASE B: EJECUCIÓN DETERMINISTA ═══`);
    console.log(`Feature: '${feature}' [v${contract.v}]`);

    // ── 1. Hash Semántico (Anti-Drift) ──
    const domainContext = extractDomainContext(feature);

    if (domainContext) {
        const currentHash = calculateSemanticHash(domainContext);

        if (options.updateHash) {
            contract.entityHash = currentHash;
            fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
            console.log(`✅ Hash de entidad actualizado a: ${currentHash}`);
            return;
        }

        if (contract.entityHash !== "INITIAL_SIGNATURE" && contract.entityHash !== currentHash) {
            console.error(`\n💥 DRIFT DETECTADO`);
            console.error(`   La entidad '${feature}' ha cambiado desde la última firma del contrato.`);
            console.error(`   Contrato: ${contract.entityHash}`);
            console.error(`   Actual:   ${currentHash}`);
            console.error(`   → Usa 'npm run ai generate-feature ${feature} --update-hash' si el cambio es intencional.\n`);
            return;
        }

        // ── 2. Validación Contrato vs Entidad ──
        console.log(`[🔍] Validando compatibilidad Contrato ↔ Entidad...`);
        const entityValidation = validateContractVsEntity(contract, domainContext);

        if (entityValidation.warnings.length > 0) {
            console.warn(`\n⚠️  Advertencias de compatibilidad:`);
            entityValidation.warnings.forEach(w => console.warn(`   → ${w}`));
        }

        if (!entityValidation.isValid) {
            console.error(`\n💥 INCOMPATIBILIDAD CRÍTICA Contrato ↔ Entidad:`);
            entityValidation.errors.forEach(e => console.error(`   ❌ ${e}`));
            console.error(`\n   Corrige la Entidad o el Contrato antes de generar.\n`);
            return;
        }

        console.log(`✅ Contrato y Entidad son compatibles.`);
    } else {
        console.warn(`⚠️  No se encontró entidad de dominio para '${feature}'. Generación en modo genérico.`);
    }

    // ── 3. Análisis de Impacto ──
    console.log(`[🔎] Analizando impacto en Core/ y UI/...`);
    const impact = runImpactAnalysis(feature, contract);
    const riskLabel = impact.risk === 'HIGH' ? '🔴 ALTO' : impact.risk === 'MEDIUM' ? '🟡 MEDIO' : '🟢 BAJO';
    console.log(`   Riesgo: ${riskLabel} (${impact.files.length} archivos afectados)`);

    if (impact.files.length > 0) {
        console.log(`   Archivos con referencias existentes:`);
        impact.files.slice(0, 10).forEach(f => {
            const relative = path.relative(process.cwd(), f);
            console.log(`     → ${relative}`);
        });
        if (impact.files.length > 10) console.log(`     ... y ${impact.files.length - 10} más.`);
    }

    if (impact.risk === 'HIGH') {
        const proceed = await confirmAction("\n🔴 RIESGO ALTO: Este cambio afecta a múltiples archivos. ¿Continuar?");
        if (!proceed) return;
    }

    // ── 4. Generación en Cascada ──
    const errorContextTemplate = pastErrors.length > 0 ? `\n\n=== ERRORES PASADOS (¡NO REPETIR!) ===\n${pastErrors.join('\n')}` : "";
    const decisionContextTemplate = pastDecisions.length > 0 ? `\n\n=== DECISIONES ARQUITECTÓNICAS ===\n${pastDecisions.join('\n')}` : "";

    console.log(`\n[🚀] Generando Backend (.NET Vertical Slices)...`);
    let promptBack = getBackendArchitecturePrompt(JSON.stringify(contract, null, 2), domainContext);
    promptBack += errorContextTemplate + decisionContextTemplate;
    const rawBack = await generateCode("Disciplined Executor: Arquitecto .NET Senior", promptBack);
    const backFiles = parseMultiFileOutput(rawBack);

    console.log(`[🚀] Generando Frontend (React/TypeScript)...`);
    let promptFront = getFrontendArchitecturePrompt(JSON.stringify(contract, null, 2));
    promptFront += errorContextTemplate + decisionContextTemplate;
    const rawFront = await generateCode("Disciplined Executor: Arquitecto React Senior", promptFront);
    const frontFiles = parseMultiFileOutput(rawFront);

    const allFiles = [...backFiles, ...frontFiles];

    if (allFiles.length === 0) {
        console.error("❌ La IA no devolvió archivos con el formato [FILE: path]. Revisa los prompts.");
        return;
    }

    // ── 5. Validación Cruzada B2B ──
    console.log(`\n[🛡️] Validando coherencia B2B (Front ↔ Back ↔ Contrato)...`);
    const checkBack = backFiles.map(f => f.content).join("\n");
    const checkFront = frontFiles.map(f => f.content).join("\n");
    const validation = validateB2BCoherence(contract, checkFront, checkBack);

    if (!validation.isValid) {
        console.error(`\n💥 FALLO DE COHERENCIA B2B:`);
        console.error(`   ${validation.error}`);
        console.error(`   La generación ha sido bloqueada para proteger la arquitectura.\n`);
        await rememberError(feature, "Fallo de coherencia B2B", validation.error || "Error desconocido");
        return;
    }

    // ── 5.5 FASE C: VERIFICACIÓN (SDD-Verify pattern) ──
    console.log(`\n[✅] Fase C: Verificación SDD - SDD-Verify Gate...`);
    const proceedVerification = await confirmAction("¿Deseas someter el código a una revisión de calidad estricta por IA, similar a GGA? (Recomendado)");
    
    if (proceedVerification) {
        console.log(`[🔄] Analizando calidad del código con IA...`);
        const verifyPrompt = `Eres un auditor estricto de código. Revisa esta implementación completa (Front+Back) para el requerimiento: "${feature}".
Asegura que: 
1. Los nombres de variables sean coherentes.
2. No falten imports esenciales.
3. Se haga buen manejo de errores.
4. Cumple con los contratos estricots de DD de backend y frontend de NitroGroups.

=== BACKEND (.NET) ===
${checkBack}

=== FRONTEND (React) ===
${checkFront}

**Responde únicamente con "PASS" si es excelente y está listo, o escribe "FAIL: [razones detalladas]" si encuentras errores.**
`;
        const verificationResponse = await generateCode("Gentleman QA: Code Reviewer", verifyPrompt);
        if (verificationResponse.trim().toUpperCase().startsWith("PASS")) {
             console.log("   ✔️ Verificación PASADA: Calidad Excelente.");
        } else {
             console.warn(`\n⚠️  FALLO EN LA VERIFICACIÓN QA: \n${verificationResponse}`);
             const ignoreWarning = await confirmAction("La calidad no es óptima según la IA. ¿Ignorar y continuar de todos modos?");
             if (!ignoreWarning) {
                 await rememberError(feature, "Fallo en verificación QA", verificationResponse);
                 return;
             }
        }
    }

    // ── 6. Preview y Confirmación ──
    console.log(`\n✅ Coherencia garantizada. ${allFiles.length} archivos listos:`);
    console.log(`   Backend: ${backFiles.length} archivos (.cs)`);
    console.log(`   Frontend: ${frontFiles.length} archivos (.ts)`);
    allFiles.forEach(f => console.log(`     → ${f.path}`));

    const save = await confirmAction(`\n¿Escribir los ${allFiles.length} archivos en la arquitectura real?`);

    if (save) {
        for (const file of allFiles) {
            const fullPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, file.content);
            console.log(`  ✔️ ${file.path}`);
        }

        // Telemetría de éxito
        const logDir = path.join(__dirname, "../logs");
        fs.mkdirSync(logDir, { recursive: true });
        const logPath = path.join(logDir, "success.json");
        const logData = {
            feature,
            filesGenerated: allFiles.length,
            risk: impact.risk,
            timestamp: new Date().toISOString()
        };
        const existing = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf-8")) : [];
        existing.push(logData);
        fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));

        await rememberSuccess(feature, `Generado exitosamente con ${backFiles.length} archivos back y ${frontFiles.length} archivos front.`, allFiles.length);

        console.log(`\n🚀 Feature '${feature}' desplegado exitosamente en la arquitectura NitroGroups.`);
    } else {
        console.log("❌ Operación abortada.");
    }
}
