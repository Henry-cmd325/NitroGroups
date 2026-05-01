"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFeature = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const diffViewer_1 = require("../utils/diffViewer");
const b2bValidator_1 = require("../validators/b2bValidator");
const engramClient_1 = require("../memory/engramClient");
const promptContextPhase_1 = require("../orchestrator/phases/promptContextPhase");
const llmGenerationPhase_1 = require("../orchestrator/phases/llmGenerationPhase");
const generatedOutputPhase_1 = require("../orchestrator/phases/generatedOutputPhase");
const structuralB2BPhase_1 = require("../orchestrator/phases/structuralB2BPhase");
const autoRepairLoopPhase_1 = require("../orchestrator/phases/autoRepairLoopPhase");
const persistPhase_1 = require("../orchestrator/phases/persistPhase");
const types_1 = require("../orchestrator/types");
const frontendStabilizePass_1 = require("../orchestrator/pipeline/frontendStabilizePass");
const modes_1 = require("../orchestrator/pipeline/modes");
const runVerdict_1 = require("../orchestrator/pipeline/runVerdict");
const verdictPhase_1 = require("../orchestrator/phases/verdictPhase");
const wireInPhase_1 = require("../orchestrator/phases/wireInPhase");
const sandbox_1 = require("../orchestrator/pipeline/sandbox");
const draftingPhase_1 = require("../orchestrator/phases/draftingPhase");
const businessElicitationPhase_1 = require("../orchestrator/phases/businessElicitationPhase");
const impactPhase_1 = require("../orchestrator/phases/impactPhase");
const moduleContextPhase_1 = require("../orchestrator/phases/moduleContextPhase");
const entityHashPhase_1 = require("../orchestrator/phases/entityHashPhase");
const qualityGatesCore_1 = require("../orchestrator/pipeline/qualityGatesCore");
const contractNameNormalize_1 = require("../orchestrator/contract/contractNameNormalize");
const endpointRouteConflict_1 = require("../orchestrator/contract/endpointRouteConflict");
function findMatchingEntityForFeature(feature, projectRoot) {
    const coreDir = path_1.default.join(projectRoot, "Core");
    if (!fs_1.default.existsSync(coreDir))
        return null;
    const pascal = feature.charAt(0).toUpperCase() + feature.slice(1);
    const needle = pascal.toLowerCase();
    for (const module of fs_1.default.readdirSync(coreDir)) {
        const entityDir = path_1.default.join(coreDir, module, `NitroGroups.Core.${module}.Domain`, "Entities");
        if (!fs_1.default.existsSync(entityDir))
            continue;
        const files = fs_1.default.readdirSync(entityDir).filter(f => f.endsWith(".cs"));
        for (const file of files) {
            const base = file.replace(/\.cs$/i, "");
            if (base.toLowerCase() === needle) {
                return { entityName: base, moduleName: module };
            }
        }
    }
    return null;
}
function findRelatedContracts(feature, projectRoot) {
    const dir = path_1.default.join(projectRoot, "ai", "contracts", "b2b");
    if (!fs_1.default.existsSync(dir))
        return [];
    const needle = feature.toLowerCase();
    const results = [];
    for (const file of fs_1.default.readdirSync(dir)) {
        if (!file.endsWith(".contract.json"))
            continue;
        const full = path_1.default.join(dir, file);
        try {
            const raw = JSON.parse(fs_1.default.readFileSync(full, "utf-8"));
            const fname = String(raw.feature || "").toLowerCase();
            const ep = String(raw.endpoint || "").toLowerCase();
            const base = file.replace(".contract.json", "").toLowerCase();
            let score = 0;
            if (fname === needle || base === needle)
                score = 100;
            else if (fname.includes(needle) || base.includes(needle))
                score = 60;
            else if (ep.includes(needle))
                score = 40;
            if (score > 0) {
                results.push({
                    path: full,
                    filename: file,
                    feature: String(raw.feature || ""),
                    endpoint: String(raw.endpoint || ""),
                    score
                });
            }
        }
        catch {
            // contrato corrupto, se ignora.
        }
    }
    return results.sort((a, b) => b.score - a.score);
}
async function generateFeature(feature, options = {}) {
    const mode = options.mode || "full-stack";
    let modeConfig = { ...(0, modes_1.getModeConfig)(mode) };
    console.log(`\n🎛️  Modo: ${mode} — ${(0, modes_1.describeMode)(mode)}`);
    await (0, engramClient_1.initMemory)();
    const pastErrors = await (0, engramClient_1.recallErrors)(feature);
    const pastDecisions = await (0, engramClient_1.recallDecisions)(feature);
    const contractPath = path_1.default.join(__dirname, `../contracts/b2b/${feature}.contract.json`);
    if (!fs_1.default.existsSync(contractPath)) {
        const entitySuggestion = findMatchingEntityForFeature(feature, process.cwd());
        if (entitySuggestion) {
            console.log(`\n🎯 Detectamos que la feature '${feature}' coincide con la entidad del dominio '${entitySuggestion.entityName}' (módulo ${entitySuggestion.moduleName}).`);
            console.log(`   Derivar el contrato desde la entidad evita que el LLM invente campos.`);
            const autogen = await (0, diffViewer_1.confirmAction)(`\n¿Generar el contrato automáticamente desde '${entitySuggestion.entityName}'?`);
            if (autogen) {
                const { generateContractFromEntity, writeContractFile } = await Promise.resolve().then(() => __importStar(require("../orchestrator/contract/contractFromEntity")));
                try {
                    const result = generateContractFromEntity(entitySuggestion.entityName, {
                        feature,
                        module: entitySuggestion.moduleName,
                        operation: "list",
                        excludeAudit: true,
                        projectRoot: process.cwd()
                    });
                    const { path: saved } = writeContractFile(result.contract, process.cwd(), true);
                    console.log(`🆕 Contrato derivado escrito en ${path_1.default.relative(process.cwd(), saved)} (${Object.keys(result.contract.methods[0].response?.fields || {}).length} campos mapeados).`);
                    if (result.notes.length > 0) {
                        result.notes.forEach(n => console.log(`   • ${n}`));
                    }
                }
                catch (error) {
                    console.warn(`\n⚠️  Derivación automática falló: ${error?.message}. Cayendo al flujo estándar.`);
                }
            }
        }
        if (!fs_1.default.existsSync(contractPath)) {
            const related = findRelatedContracts(feature, process.cwd());
            if (related.length > 0) {
                console.log(`\n🔎 No existe '${feature}.contract.json', pero detectamos contratos relacionados:`);
                related.forEach((r, i) => {
                    const hint = r.score >= 100 ? " (match exacto por feature/filename)" : "";
                    console.log(`   [${i + 1}] ${r.filename}  (feature='${r.feature}', endpoint='${r.endpoint}')${hint}`);
                });
                const best = related[0];
                const useIt = await (0, diffViewer_1.confirmAction)(`\n¿Usar '${best.filename}' como contrato de la feature '${feature}'? ` +
                    `(Creará un alias '${feature}.contract.json' apuntando al mismo contenido).`);
                if (useIt) {
                    const sourceContract = JSON.parse(fs_1.default.readFileSync(best.path, "utf-8"));
                    sourceContract.feature = feature;
                    fs_1.default.writeFileSync(contractPath, JSON.stringify(sourceContract, null, 2));
                    console.log(`✅ Alias creado: ai/contracts/b2b/${feature}.contract.json (derivado de ${best.filename}).`);
                }
                else {
                    console.log(`↩️  OK, seguimos al flujo de drafting por LLM (FASE A).`);
                    await (0, draftingPhase_1.runDraftingPhase)(feature);
                    return { verdict: "aborted" };
                }
            }
            else {
                await (0, draftingPhase_1.runDraftingPhase)(feature);
                return { verdict: "aborted" };
            }
        }
    }
    const contractStr = fs_1.default.readFileSync(contractPath, "utf-8");
    const contract = JSON.parse(contractStr);
    const contractIntegrity = (0, b2bValidator_1.validateContractIntegrity)(contract);
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
    (0, contractNameNormalize_1.normalizeB2BContractDtoNamesInPlace)(contract);
    if (mode === "contract-only") {
        console.log(`\n📄 Contrato '${feature}' validado. Modo contract-only: no se genera código.`);
        return;
    }
    const elicitation = await (0, businessElicitationPhase_1.runPreCodegenElicitationPhase)({
        feature,
        contract: contract,
        dryRun: options.dryRun === true
    });
    if (!elicitation.proceed) {
        return { verdict: "aborted" };
    }
    console.log(`\n🤖 ═══ FASE B: EJECUCIÓN DETERMINISTA ═══`);
    console.log(`Feature: '${feature}' [v${contract.v}]`);
    const sandboxRetentionDays = Number(process.env.ORCH_SANDBOX_RETENTION_DAYS || 7);
    const gc = (0, sandbox_1.gcOldSandboxes)(process.cwd(), sandboxRetentionDays);
    if (gc.removed.length > 0) {
        console.log(`🧹 GC sandbox: eliminados ${gc.removed.length} snapshots > ${sandboxRetentionDays}d (conservados: ${gc.kept}).`);
    }
    const projectRoot = process.cwd();
    const { moduleName, domainContext } = (0, moduleContextPhase_1.runModuleContextPhase)(feature, projectRoot);
    if (!(0, moduleContextPhase_1.enforceBackendModuleOrReport)(mode, moduleName, projectRoot)) {
        return;
    }
    console.log(`[🧭] Módulo backend resuelto: ${moduleName}`);
    let routeConflictScan = [];
    if (modeConfig.generateBackend) {
        routeConflictScan = (0, endpointRouteConflict_1.findBackendHttpRouteConflicts)(projectRoot, contract);
        if (routeConflictScan.length > 0) {
            console.warn("\n⚠️  RUTA API ya registrada en el repositorio (mismo method + path que el contrato):");
            routeConflictScan.forEach(h => console.warn(`   → ${h.http} ${h.routePattern}  —  ${h.relativePath}`));
            if (options.dryRun) {
                console.warn("   (dry-run) Se omite generación de backend para evitar duplicar el endpoint.\n");
                modeConfig = {
                    ...modeConfig,
                    generateBackend: false,
                    enforceBackendModule: false,
                    validateBackendStructural: false,
                    runDotnetBuild: false
                };
            }
            else {
                const feOnly = await (0, diffViewer_1.confirmAction)("¿Solo generar el FRONTEND? (recomendado: el backend existente ya cubre la ruta.)");
                if (feOnly) {
                    modeConfig = {
                        ...modeConfig,
                        generateBackend: false,
                        enforceBackendModule: false,
                        validateBackendStructural: false,
                        runDotnetBuild: false
                    };
                    console.log("   → Continuando en modo efectivo: solo UI + validación TypeScript del front.\n");
                }
                else {
                    console.warn("   → Se generará backend igualmente: revisa luego que no haya MapGet/MapPost duplicados (fallo al arranque o rutas inesperadas).\n");
                }
            }
        }
    }
    const signals = (0, runVerdict_1.createRunSignals)();
    signals.backendRequested = modeConfig.generateBackend;
    signals.frontendRequested = modeConfig.generateFrontend;
    signals.backendSkippedForRouteConflict =
        routeConflictScan.length > 0 &&
            !modeConfig.generateBackend &&
            (options.mode || "full-stack") === "full-stack";
    const cTyped = contract;
    const hashResult = (0, entityHashPhase_1.runEntityHashPhase)({
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
        (0, entityHashPhase_1.reportEntityHashDrift)(feature, hashResult);
        return;
    }
    if (hashResult.outcome === "entity-mismatch") {
        return;
    }
    const impactResult = await (0, impactPhase_1.runImpactPhase)({
        feature,
        contract: cTyped,
        nonInteractive: options.dryRun === true,
    });
    if (impactResult.aborted) {
        return { verdict: "aborted" };
    }
    const promptLesson = (0, promptContextPhase_1.buildPromptLessonContext)(feature, pastDecisions, pastErrors);
    (0, promptContextPhase_1.logPromptLessonSummary)(promptLesson.lessonCounts);
    const { files: genFromLlm } = await (0, llmGenerationPhase_1.runLlmGenerationPhase)({
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
    const sanitized = (0, generatedOutputPhase_1.sanitizeProtectedFiles)(moduleName, generatedFiles, feature);
    generatedFiles = sanitized.files;
    if (sanitized.droppedPaths.length > 0) {
        console.warn("\n⚠️  Se omitió salida de la IA: rutas inválidas, `Abstractions/`, o " +
            "ficheros C# en la ruta de la feature sin subcarpeta de operación (p. ej. `Get/`, `Create/`, etc.).");
        sanitized.droppedPaths.forEach(file => console.warn(`   → ${file}`));
    }
    if (generatedFiles.length === 0) {
        console.error("❌ No se obtuvo ningún archivo generado. Revisa prompts o contrato.");
        return;
    }
    if (modeConfig.generateFrontend) {
        const normalization = (0, frontendStabilizePass_1.stabilizeFrontendOutput)(generatedFiles, { maxRounds: 3 });
        if (normalization.changes.length > 0) {
            console.log(`\n[🧽] Normalizando salida frontend (${normalization.changes.length} patch${normalization.changes.length === 1 ? "" : "es"} determinista${normalization.changes.length === 1 ? "" : "s"})...`);
            normalization.changes.slice(0, 6).forEach(c => console.log(`   · ${c}`));
            if (normalization.changes.length > 6)
                console.log(`   · ... y ${normalization.changes.length - 6} más.`);
            generatedFiles = normalization.files;
        }
    }
    let outputValidation = (0, generatedOutputPhase_1.validateGeneratedOutput)(feature, moduleName, generatedFiles, mode);
    if (!outputValidation.isValid) {
        console.warn(`\n⚠️  Salida LLM fuera de reglas:`);
        outputValidation.errors.forEach(error => console.warn(`   · ${error}`));
        const recovered = (0, generatedOutputPhase_1.recoverInvalidOutput)(feature, moduleName, generatedFiles, cTyped, outputValidation.issues, mode, projectRoot);
        if (!recovered) {
            console.error(`\n💥 SALIDA GENERADA INVÁLIDA (issues fatales, no recuperables):`);
            outputValidation.issues.filter(i => i.kind === "fatal").forEach(i => console.error(`   ❌ ${i.message}`));
            await (0, engramClient_1.rememberError)(feature, "Salida IA inválida", outputValidation.errors.join(" | "));
            return;
        }
        generatedFiles = recovered;
        outputValidation = (0, generatedOutputPhase_1.validateGeneratedOutput)(feature, moduleName, generatedFiles, mode);
        if (!outputValidation.isValid) {
            console.error(`\n💥 RECUPERACIÓN DETERMINISTA NO CORRIGIÓ LA SALIDA:`);
            outputValidation.errors.forEach(error => console.error(`   ❌ ${error}`));
            await (0, engramClient_1.rememberError)(feature, "Recuperación determinista inválida", outputValidation.errors.join(" | "));
            return;
        }
        console.log(`   ✔️ Salida recuperada con fallback determinista.`);
    }
    const structuralResult = await (0, structuralB2BPhase_1.runStructuralB2BPhase)({
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
        const postB2B = (0, frontendStabilizePass_1.stabilizeFrontendOutput)(generatedFiles, { maxRounds: 3 });
        if (postB2B.changes.length > 0) {
            console.log(`\n[🧽] Ajuste frontend post-B2B (${postB2B.changes.length} patch${postB2B.changes.length === 1 ? "" : "es"})...`);
            postB2B.changes.slice(0, 6).forEach(c => console.log(`   · ${c}`));
            if (postB2B.changes.length > 6)
                console.log(`   · ... y ${postB2B.changes.length - 6} más.`);
        }
        generatedFiles = postB2B.files;
    }
    const sanitizedPostB2B = (0, generatedOutputPhase_1.sanitizeProtectedFiles)(moduleName, generatedFiles, feature);
    generatedFiles = sanitizedPostB2B.files;
    if (sanitizedPostB2B.droppedPaths.length > 0) {
        console.warn(`\n⚠️  Tras B2B estructural, se filtró salida insegura (huérfanos, Abstractions, GetAllAsync):`);
        sanitizedPostB2B.droppedPaths.forEach(p => console.warn(`   → ${p}`));
    }
    console.log(`\n[🔁] Ejecutando Quality Gates con autocorrección...`);
    const baseline = (0, qualityGatesCore_1.collectQualityBaseline)(mode, feature);
    const repairResult = await (0, autoRepairLoopPhase_1.runAutoRepairLoop)(feature, moduleName, generatedFiles, baseline, cTyped, mode);
    if (!repairResult.ok) {
        const details = repairResult.lastError || "Autocorrección agotada";
        console.error(`\n💥 NO SE PUDO AUTOCORREGIR LA GENERACIÓN.`);
        console.error(`   ${details}\n`);
        await (0, engramClient_1.rememberError)(feature, "Autocorrección agotada", details.substring(0, 4000));
        return;
    }
    generatedFiles = repairResult.files;
    signals.autoRepairRounds = repairResult.stats.llmRounds;
    if (repairResult.stats.backendFallbackActivated)
        signals.backendDeterministicFallback = true;
    if (repairResult.stats.frontendFallbackActivated)
        signals.frontendDeterministicFallback = true;
    if (repairResult.stats.backendDiscarded)
        signals.backendDiscarded = true;
    if (modeConfig.generateFrontend) {
        const postRepair = (0, frontendStabilizePass_1.stabilizeFrontendOutput)(generatedFiles, { maxRounds: 3 });
        if (postRepair.changes.length > 0) {
            console.log(`\n[🔬] Micro-correcciones finales (post-reparación, ${postRepair.changes.length} ajuste(s))...`);
            postRepair.changes.slice(0, 6).forEach(c => console.log(`   · ${c}`));
            if (postRepair.changes.length > 6)
                console.log(`   · ... y ${postRepair.changes.length - 6} más.`);
        }
        generatedFiles = postRepair.files;
    }
    let postRepairValidation = (0, generatedOutputPhase_1.validateGeneratedOutput)(feature, moduleName, generatedFiles, mode);
    if (!postRepairValidation.isValid) {
        const recovered = (0, generatedOutputPhase_1.recoverInvalidOutput)(feature, moduleName, generatedFiles, cTyped, postRepairValidation.issues, mode, projectRoot);
        if (recovered) {
            generatedFiles = recovered;
            postRepairValidation = (0, generatedOutputPhase_1.validateGeneratedOutput)(feature, moduleName, generatedFiles, mode);
        }
    }
    if (!postRepairValidation.isValid) {
        const details = postRepairValidation.errors.join(" | ");
        console.error(`\n💥 AUTOCORRECCIÓN PRODUJO SALIDA FUERA DE REGLAS.`);
        postRepairValidation.errors.forEach(error => console.error(`   ❌ ${error}`));
        await (0, engramClient_1.rememberError)(feature, "Autocorrección inválida", details.substring(0, 4000));
        return;
    }
    if (modeConfig.generateFrontend) {
        const wireInResult = (0, wireInPhase_1.runWireInPhase)({
            feature,
            projectRoot: process.cwd(),
            generatedFiles,
            skipIfExists: true,
        });
        generatedFiles = wireInResult.files;
    }
    const backendReady = generatedFiles.filter(file => (0, types_1.normalizeToPosix)(file.path).startsWith("Core/")).length;
    const frontendReady = generatedFiles.filter(file => (0, types_1.normalizeToPosix)(file.path).startsWith("UI/")).length;
    console.log(`\n✅ Coherencia garantizada. ${generatedFiles.length} archivos listos:`);
    console.log(`   Backend: ${backendReady} archivos`);
    console.log(`   Frontend: ${frontendReady} archivos`);
    generatedFiles.forEach(f => console.log(`     → ${f.path}`));
    const sandboxSnap = (0, sandbox_1.snapshotToSandbox)(feature, mode, generatedFiles, process.cwd());
    console.log(`   📦 Snapshot en sandbox: ${path_1.default.relative(process.cwd(), sandboxSnap.dir)}`);
    if (options.dryRun) {
        console.log(`\n💨 --dry-run activo: no se escribirá ningún archivo.`);
        console.log(`   Snapshot disponible en ${path_1.default.relative(process.cwd(), sandboxSnap.dir)} para revisión manual.`);
        (0, sandbox_1.stampSandboxVerdict)(sandboxSnap.dir, "dry-run");
        const dryReport = (0, runVerdict_1.buildVerdictReport)(feature, mode, signals);
        (0, runVerdict_1.printVerdictReport)(dryReport);
        return { verdict: "dry-run", detail: `Simulación: verdict hipotético = ${dryReport.verdict}` };
    }
    const persist = await (0, persistPhase_1.runPersistToDiskPhase)({
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
    const verdictResult = await (0, verdictPhase_1.runVerdictPhase)({
        feature,
        mode,
        signals,
        sandboxDir: sandboxSnap.dir,
        generatedFiles,
        backendReady,
        frontendReady,
        impactRisk: impactResult.risk,
        aiLogsDir: path_1.default.join(__dirname, "../logs"),
    });
    return { verdict: verdictResult.verdict, detail: verdictResult.detail };
}
exports.generateFeature = generateFeature;
