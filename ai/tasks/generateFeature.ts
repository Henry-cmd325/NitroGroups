import fs from "fs";
import path from "path";
import { confirmAction } from "../utils/diffViewer";
import { validateContractIntegrity } from "../validators/b2bValidator";
import { initMemory, recallDecisions, rememberError, recallErrors } from "../memory/engramClient";
import { buildPromptLessonContext, logPromptLessonSummary } from "../orchestrator/phases/promptContextPhase";
import { runLlmGenerationPhase } from "../orchestrator/phases/llmGenerationPhase";
import {
    validateGeneratedOutput,
    recoverInvalidOutput,
    sanitizeProtectedFiles
} from "../orchestrator/phases/generatedOutputPhase";
import { runStructuralB2BPhase } from "../orchestrator/phases/structuralB2BPhase";
import { runAutoRepairLoop } from "../orchestrator/phases/autoRepairLoopPhase";
import { runPersistToDiskPhase } from "../orchestrator/phases/persistPhase";

import { OrchestratorMode, B2BContract, normalizeToPosix } from "../orchestrator/types";
import { normalizeFrontendOutput } from "../orchestrator/generation/frontendNormalizer";
import { stabilizeFrontendOutput } from "../orchestrator/pipeline/frontendStabilizePass";
import { getModeConfig, describeMode } from "../orchestrator/pipeline/modes";
import { createRunSignals, buildVerdictReport, printVerdictReport, RunSignals } from "../orchestrator/pipeline/runVerdict";
import { runVerdictPhase } from "../orchestrator/phases/verdictPhase";
import { runWireInPhase } from "../orchestrator/phases/wireInPhase";
import { gcOldSandboxes, snapshotToSandbox, stampSandboxVerdict } from "../orchestrator/pipeline/sandbox";
import { runDraftingPhase } from "../orchestrator/phases/draftingPhase";
import { runPreCodegenElicitationPhase } from "../orchestrator/phases/businessElicitationPhase";
import { runImpactPhase } from "../orchestrator/phases/impactPhase";
import {
    runModuleContextPhase,
    enforceBackendModuleOrReport
} from "../orchestrator/phases/moduleContextPhase";
import { runEntityHashPhase, reportEntityHashDrift } from "../orchestrator/phases/entityHashPhase";
import { type QualityBaseline, collectQualityBaseline } from "../orchestrator/pipeline/qualityGatesCore";
import { normalizeB2BContractDtoNamesInPlace } from "../orchestrator/contract/contractNameNormalize";
import { findBackendHttpRouteConflicts } from "../orchestrator/contract/endpointRouteConflict";

interface RelatedContract {
    path: string;
    filename: string;
    feature: string;
    endpoint: string;
    score: number;
}

function findMatchingEntityForFeature(feature: string, projectRoot: string): { entityName: string; moduleName: string } | null {
    const coreDir = path.join(projectRoot, "Core");
    if (!fs.existsSync(coreDir)) return null;

    const pascal = feature.charAt(0).toUpperCase() + feature.slice(1);
    const needle = pascal.toLowerCase();

    for (const module of fs.readdirSync(coreDir)) {
        const entityDir = path.join(coreDir, module, `NitroGroups.Core.${module}.Domain`, "Entities");
        if (!fs.existsSync(entityDir)) continue;
        const files = fs.readdirSync(entityDir).filter(f => f.endsWith(".cs"));
        for (const file of files) {
            const base = file.replace(/\.cs$/i, "");
            if (base.toLowerCase() === needle) {
                return { entityName: base, moduleName: module };
            }
        }
    }
    return null;
}

function findRelatedContracts(feature: string, projectRoot: string): RelatedContract[] {
    const dir = path.join(projectRoot, "ai", "contracts", "b2b");
    if (!fs.existsSync(dir)) return [];

    const needle = feature.toLowerCase();
    const results: RelatedContract[] = [];

    for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".contract.json")) continue;
        const full = path.join(dir, file);
        try {
            const raw = JSON.parse(fs.readFileSync(full, "utf-8"));
            const fname = String(raw.feature || "").toLowerCase();
            const ep = String(raw.endpoint || "").toLowerCase();
            const base = file.replace(".contract.json", "").toLowerCase();

            let score = 0;
            if (fname === needle || base === needle) score = 100;
            else if (fname.includes(needle) || base.includes(needle)) score = 60;
            else if (ep.includes(needle)) score = 40;

            if (score > 0) {
                results.push({
                    path: full,
                    filename: file,
                    feature: String(raw.feature || ""),
                    endpoint: String(raw.endpoint || ""),
                    score
                });
            }
        } catch {
            // contrato corrupto, se ignora.
        }
    }
    return results.sort((a, b) => b.score - a.score);
}

export interface GenerateFeatureOptions {
    updateHash?: boolean;
    mode?: OrchestratorMode;
    dryRun?: boolean;
}

export type GenerateFeatureResultVerdict = "real" | "partial" | "stub" | "failed" | "aborted" | "dry-run";

export interface GenerateFeatureResult {
    verdict: GenerateFeatureResultVerdict;
    detail?: string;
}

export async function generateFeature(
    feature: string,
    options: GenerateFeatureOptions = {}
): Promise<GenerateFeatureResult | void> {
    const mode: OrchestratorMode = options.mode || "full-stack";
    let modeConfig = { ...getModeConfig(mode) };

    console.log(`\n🎛️  Modo: ${mode} — ${describeMode(mode)}`);

    await initMemory();
    const pastErrors = await recallErrors(feature);
    const pastDecisions = await recallDecisions(feature);

    const contractPath = path.join(__dirname, `../contracts/b2b/${feature}.contract.json`);

    if (!fs.existsSync(contractPath)) {
        const entitySuggestion = findMatchingEntityForFeature(feature, process.cwd());
        if (entitySuggestion) {
            console.log(`\n🎯 Detectamos que la feature '${feature}' coincide con la entidad del dominio '${entitySuggestion.entityName}' (módulo ${entitySuggestion.moduleName}).`);
            console.log(`   Derivar el contrato desde la entidad evita que el LLM invente campos.`);
            const autogen = await confirmAction(
                `\n¿Generar el contrato automáticamente desde '${entitySuggestion.entityName}'?`
            );
            if (autogen) {
                const { generateContractFromEntity, writeContractFile } = await import("../orchestrator/contract/contractFromEntity");
                try {
                    const result = generateContractFromEntity(entitySuggestion.entityName, {
                        feature,
                        module: entitySuggestion.moduleName,
                        operation: "list",
                        excludeAudit: true,
                        projectRoot: process.cwd()
                    });
                    const { path: saved } = writeContractFile(result.contract, process.cwd(), true);
                    console.log(`🆕 Contrato derivado escrito en ${path.relative(process.cwd(), saved)} (${Object.keys(result.contract.methods[0].response?.fields || {}).length} campos mapeados).`);
                    if (result.notes.length > 0) {
                        result.notes.forEach(n => console.log(`   • ${n}`));
                    }
                } catch (error: any) {
                    console.warn(`\n⚠️  Derivación automática falló: ${error?.message}. Cayendo al flujo estándar.`);
                }
            }
        }

        if (!fs.existsSync(contractPath)) {
            const related = findRelatedContracts(feature, process.cwd());
            if (related.length > 0) {
                console.log(`\n🔎 No existe '${feature}.contract.json', pero detectamos contratos relacionados:`);
                related.forEach((r, i) => {
                    const hint = r.score >= 100 ? " (match exacto por feature/filename)" : "";
                    console.log(`   [${i + 1}] ${r.filename}  (feature='${r.feature}', endpoint='${r.endpoint}')${hint}`);
                });
                const best = related[0];
                const useIt = await confirmAction(
                    `\n¿Usar '${best.filename}' como contrato de la feature '${feature}'? ` +
                    `(Creará un alias '${feature}.contract.json' apuntando al mismo contenido).`
                );
                if (useIt) {
                    const sourceContract = JSON.parse(fs.readFileSync(best.path, "utf-8"));
                    sourceContract.feature = feature;
                    fs.writeFileSync(contractPath, JSON.stringify(sourceContract, null, 2));
                    console.log(`✅ Alias creado: ai/contracts/b2b/${feature}.contract.json (derivado de ${best.filename}).`);
                } else {
                    console.log(`↩️  OK, seguimos al flujo de drafting por LLM (FASE A).`);
                    await runDraftingPhase(feature);
                    return { verdict: "aborted" };
                }
            } else {
                await runDraftingPhase(feature);
                return { verdict: "aborted" };
            }
        }
    }

    const contractStr = fs.readFileSync(contractPath, "utf-8");
    const contract = JSON.parse(contractStr);
    const contractIntegrity = validateContractIntegrity(contract);
    if (!contractIntegrity.isValid) {
        console.error(`\n💥 CONTRATO B2B INVÁLIDO:`);
        contractIntegrity.errors.forEach(error => console.error(`   ❌ ${error}`));
        if (contractIntegrity.warnings.length > 0) {
            contractIntegrity.warnings.forEach(warning => console.warn(`   ⚠️  ${warning}`));
        }
        console.error(`\n   Corrige el contrato antes de continuar.\n`);
        return;
    }
    contractIntegrity.warnings.forEach(warning => console.warn(`⚠️  ${warning}`));

    normalizeB2BContractDtoNamesInPlace(contract as B2BContract);

    if (mode === "contract-only") {
        console.log(`\n📄 Contrato '${feature}' validado. Modo contract-only: no se genera código.`);
        return;
    }

    const elicitation = await runPreCodegenElicitationPhase({
        feature,
        contract: contract as B2BContract,
        dryRun: options.dryRun === true
    });
    if (!elicitation.proceed) {
        return { verdict: "aborted" };
    }

    console.log(`\n🤖 ═══ FASE B: EJECUCIÓN DETERMINISTA ═══`);
    console.log(`Feature: '${feature}' [v${contract.v}]`);

    const sandboxRetentionDays = Number(process.env.ORCH_SANDBOX_RETENTION_DAYS || 7);
    const gc = gcOldSandboxes(process.cwd(), sandboxRetentionDays);
    if (gc.removed.length > 0) {
        console.log(`🧹 GC sandbox: eliminados ${gc.removed.length} snapshots > ${sandboxRetentionDays}d (conservados: ${gc.kept}).`);
    }

    const projectRoot = process.cwd();
    const { moduleName, domainContext } = runModuleContextPhase(feature, projectRoot);
    if (!enforceBackendModuleOrReport(mode, moduleName, projectRoot)) {
        return;
    }

    console.log(`[🧭] Módulo backend resuelto: ${moduleName}`);

    let routeConflictScan: ReturnType<typeof findBackendHttpRouteConflicts> = [];
    if (modeConfig.generateBackend) {
        routeConflictScan = findBackendHttpRouteConflicts(projectRoot, contract as B2BContract);
        if (routeConflictScan.length > 0) {
            console.warn(
                "\n⚠️  RUTA API ya registrada en el repositorio (mismo method + path que el contrato):"
            );
            routeConflictScan.forEach(h =>
                console.warn(`   → ${h.http} ${h.routePattern}  —  ${h.relativePath}`)
            );
            if (options.dryRun) {
                console.warn("   (dry-run) Se omite generación de backend para evitar duplicar el endpoint.\n");
                modeConfig = {
                    ...modeConfig,
                    generateBackend: false,
                    enforceBackendModule: false,
                    validateBackendStructural: false,
                    runDotnetBuild: false
                };
            } else {
                const feOnly = await confirmAction(
                    "¿Solo generar el FRONTEND? (recomendado: el backend existente ya cubre la ruta.)"
                );
                if (feOnly) {
                    modeConfig = {
                        ...modeConfig,
                        generateBackend: false,
                        enforceBackendModule: false,
                        validateBackendStructural: false,
                        runDotnetBuild: false
                    };
                    console.log("   → Continuando en modo efectivo: solo UI + validación TypeScript del front.\n");
                } else {
                    console.warn(
                        "   → Se generará backend igualmente: revisa luego que no haya MapGet/MapPost duplicados (fallo al arranque o rutas inesperadas).\n"
                    );
                }
            }
        }
    }

    const signals: RunSignals = createRunSignals();
    signals.backendRequested = modeConfig.generateBackend;
    signals.frontendRequested = modeConfig.generateFrontend;
    signals.backendSkippedForRouteConflict =
        routeConflictScan.length > 0 &&
        !modeConfig.generateBackend &&
        (options.mode || "full-stack") === "full-stack";

    const cTyped = contract as B2BContract;
    const hashResult = runEntityHashPhase({
        contract: cTyped,
        contractPath,
        domainContext,
        generateBackend: modeConfig.generateBackend,
        updateHash: options.updateHash,
    });
    if (hashResult.outcome === "hash-updated") {
        return;
    }
    if (hashResult.outcome === "drift") {
        reportEntityHashDrift(feature, hashResult);
        return;
    }
    if (hashResult.outcome === "entity-mismatch") {
        return;
    }

    const impactResult = await runImpactPhase({
        feature,
        contract: cTyped,
        nonInteractive: options.dryRun === true,
    });
    if (impactResult.aborted) {
        return { verdict: "aborted" };
    }

    const promptLesson = buildPromptLessonContext(feature, pastDecisions, pastErrors);
    logPromptLessonSummary(promptLesson.lessonCounts);

    const { files: genFromLlm } = await runLlmGenerationPhase({
        feature,
        contract: cTyped,
        moduleName,
        domainContext,
        modeConfig,
        signals,
        lessonContext: {
            backendLessonBlock: promptLesson.backendLessonBlock,
            frontendLessonBlock: promptLesson.frontendLessonBlock,
            decisionContextTemplate: promptLesson.decisionContextTemplate
        },
        projectRoot: process.cwd()
    });
    let generatedFiles = genFromLlm;

    const sanitized = sanitizeProtectedFiles(moduleName, generatedFiles, feature);
    generatedFiles = sanitized.files;
    if (sanitized.droppedPaths.length > 0) {
        console.warn(
            "\n⚠️  Se omitió salida de la IA: rutas inválidas, `Abstractions/`, o " +
            "ficheros C# en la ruta de la feature sin subcarpeta de operación (p. ej. `Get/`, `Create/`, etc.)."
        );
        sanitized.droppedPaths.forEach(file => console.warn(`   → ${file}`));
    }

    if (generatedFiles.length === 0) {
        console.error("❌ No se obtuvo ningún archivo generado. Revisa prompts o contrato.");
        return;
    }

    if (modeConfig.generateFrontend) {
        const normalization = stabilizeFrontendOutput(generatedFiles, { maxRounds: 3 });
        if (normalization.changes.length > 0) {
            console.log(`\n[🧽] Normalizando salida frontend (${normalization.changes.length} patch${normalization.changes.length === 1 ? "" : "es"} determinista${normalization.changes.length === 1 ? "" : "s"})...`);
            normalization.changes.slice(0, 6).forEach(c => console.log(`   · ${c}`));
            if (normalization.changes.length > 6) console.log(`   · ... y ${normalization.changes.length - 6} más.`);
            generatedFiles = normalization.files;
        }
    }

    let outputValidation = validateGeneratedOutput(feature, moduleName, generatedFiles, mode);
    if (!outputValidation.isValid) {
        console.warn(`\n⚠️  Salida LLM fuera de reglas:`);
        outputValidation.errors.forEach(error => console.warn(`   · ${error}`));
        const recovered = recoverInvalidOutput(
            feature,
            moduleName,
            generatedFiles,
            cTyped,
            outputValidation.issues,
            mode,
            projectRoot
        );
        if (!recovered) {
            console.error(`\n💥 SALIDA GENERADA INVÁLIDA (issues fatales, no recuperables):`);
            outputValidation.issues.filter(i => i.kind === "fatal").forEach(i => console.error(`   ❌ ${i.message}`));
            await rememberError(feature, "Salida IA inválida", outputValidation.errors.join(" | "));
            return;
        }
        generatedFiles = recovered;
        outputValidation = validateGeneratedOutput(feature, moduleName, generatedFiles, mode);
        if (!outputValidation.isValid) {
            console.error(`\n💥 RECUPERACIÓN DETERMINISTA NO CORRIGIÓ LA SALIDA:`);
            outputValidation.errors.forEach(error => console.error(`   ❌ ${error}`));
            await rememberError(feature, "Recuperación determinista inválida", outputValidation.errors.join(" | "));
            return;
        }
        console.log(`   ✔️ Salida recuperada con fallback determinista.`);
    }

    const structuralResult = await runStructuralB2BPhase({
        feature,
        contract: cTyped,
        moduleName,
        mode,
        modeConfig,
        signals,
        files: generatedFiles,
        projectRoot,
    });
    if (!structuralResult.ok) {
        return;
    }
    generatedFiles = structuralResult.files;
    if (modeConfig.generateFrontend) {
        const postB2B = stabilizeFrontendOutput(generatedFiles, { maxRounds: 3 });
        if (postB2B.changes.length > 0) {
            console.log(
                `\n[🧽] Ajuste frontend post-B2B (${postB2B.changes.length} patch${
                    postB2B.changes.length === 1 ? "" : "es"
                })...`
            );
            postB2B.changes.slice(0, 6).forEach(c => console.log(`   · ${c}`));
            if (postB2B.changes.length > 6) console.log(`   · ... y ${postB2B.changes.length - 6} más.`);
        }
        generatedFiles = postB2B.files;
    }
    const sanitizedPostB2B = sanitizeProtectedFiles(moduleName, generatedFiles, feature);
    generatedFiles = sanitizedPostB2B.files;
    if (sanitizedPostB2B.droppedPaths.length > 0) {
        console.warn(`\n⚠️  Tras B2B estructural, se filtró salida insegura (huérfanos, Abstractions, GetAllAsync):`);
        sanitizedPostB2B.droppedPaths.forEach(p => console.warn(`   → ${p}`));
    }

    console.log(`\n[🔁] Ejecutando Quality Gates con autocorrección...`);
    const baseline: QualityBaseline = collectQualityBaseline(mode, feature);
    const repairResult = await runAutoRepairLoop(feature, moduleName, generatedFiles, baseline, cTyped, mode);
    if (!repairResult.ok) {
        const details = repairResult.lastError || "Autocorrección agotada";
        console.error(`\n💥 NO SE PUDO AUTOCORREGIR LA GENERACIÓN.`);
        console.error(`   ${details}\n`);
        await rememberError(feature, "Autocorrección agotada", details.substring(0, 4000));
        return;
    }
    generatedFiles = repairResult.files;
    signals.autoRepairRounds = repairResult.stats.llmRounds;
    if (repairResult.stats.backendFallbackActivated) signals.backendDeterministicFallback = true;
    if (repairResult.stats.frontendFallbackActivated) signals.frontendDeterministicFallback = true;
    if (repairResult.stats.backendDiscarded) signals.backendDiscarded = true;

    if (modeConfig.generateFrontend) {
        const postRepair = stabilizeFrontendOutput(generatedFiles, { maxRounds: 3 });
        if (postRepair.changes.length > 0) {
            console.log(
                `\n[🔬] Micro-correcciones finales (post-reparación, ${postRepair.changes.length} ajuste(s))...`
            );
            postRepair.changes.slice(0, 6).forEach(c => console.log(`   · ${c}`));
            if (postRepair.changes.length > 6) console.log(`   · ... y ${postRepair.changes.length - 6} más.`);
        }
        generatedFiles = postRepair.files;
    }

    let postRepairValidation = validateGeneratedOutput(feature, moduleName, generatedFiles, mode);
    if (!postRepairValidation.isValid) {
        const recovered = recoverInvalidOutput(
            feature,
            moduleName,
            generatedFiles,
            cTyped,
            postRepairValidation.issues,
            mode,
            projectRoot
        );
        if (recovered) {
            generatedFiles = recovered;
            postRepairValidation = validateGeneratedOutput(feature, moduleName, generatedFiles, mode);
        }
    }
    if (!postRepairValidation.isValid) {
        const details = postRepairValidation.errors.join(" | ");
        console.error(`\n💥 AUTOCORRECCIÓN PRODUJO SALIDA FUERA DE REGLAS.`);
        postRepairValidation.errors.forEach(error => console.error(`   ❌ ${error}`));
        await rememberError(feature, "Autocorrección inválida", details.substring(0, 4000));
        return;
    }

    if (modeConfig.generateFrontend) {
        const wireInResult = runWireInPhase({
            feature,
            projectRoot: process.cwd(),
            generatedFiles,
            skipIfExists: true,
        });
        generatedFiles = wireInResult.files;
    }

    const backendReady = generatedFiles.filter(file => normalizeToPosix(file.path).startsWith("Core/")).length;
    const frontendReady = generatedFiles.filter(file => normalizeToPosix(file.path).startsWith("UI/")).length;
    console.log(`\n✅ Coherencia garantizada. ${generatedFiles.length} archivos listos:`);
    console.log(`   Backend: ${backendReady} archivos`);
    console.log(`   Frontend: ${frontendReady} archivos`);
    generatedFiles.forEach(f => console.log(`     → ${f.path}`));

    const sandboxSnap = snapshotToSandbox(feature, mode, generatedFiles, process.cwd());
    console.log(`   📦 Snapshot en sandbox: ${path.relative(process.cwd(), sandboxSnap.dir)}`);

    if (options.dryRun) {
        console.log(`\n💨 --dry-run activo: no se escribirá ningún archivo.`);
        console.log(`   Snapshot disponible en ${path.relative(process.cwd(), sandboxSnap.dir)} para revisión manual.`);
        stampSandboxVerdict(sandboxSnap.dir, "dry-run");
        const dryReport = buildVerdictReport(feature, mode, signals);
        printVerdictReport(dryReport);
        return { verdict: "dry-run", detail: `Simulación: verdict hipotético = ${dryReport.verdict}` };
    }

    const persist = await runPersistToDiskPhase({
        feature,
        moduleName,
        mode,
        generatedFiles,
        baseline,
        signals,
        sandboxDir: sandboxSnap.dir,
        projectRoot: process.cwd()
    });
    if (!persist.ok) {
        if (persist.reason === "user-aborted") {
            return { verdict: "aborted", detail: "Escritura cancelada por el usuario." };
        }
        return { verdict: "failed", detail: persist.detail };
    }

    const verdictResult = await runVerdictPhase({
        feature,
        mode,
        signals,
        sandboxDir: sandboxSnap.dir,
        generatedFiles,
        backendReady,
        frontendReady,
        impactRisk: impactResult.risk,
        aiLogsDir: path.join(__dirname, "../logs"),
        projectRoot: process.cwd()
    });

    return { verdict: verdictResult.verdict, detail: verdictResult.detail };
}
