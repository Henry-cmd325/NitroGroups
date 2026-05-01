"use strict";
/**
 * Fase final — Verdict, logging y memoria.
 *
 * Se ejecuta SOLO después de que los quality gates finales pasaron.
 * Consolida los `RunSignals` en un verdict, sella el sandbox, imprime
 * el reporte, persiste logs y graba el success en memoria Engram.
 *
 * También construye el `GenerateFeatureResult` que el caller (CLI)
 * mapea a un exit code estandarizado (ver `cli/exitCodes.ts`).
 *
 * Extraída de `generateFeature.ts` en el refactor v1.2.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVerdictPhase = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlerInspector_1 = require("../pipeline/handlerInspector");
const postRunNextSteps_1 = require("../pipeline/postRunNextSteps");
const runVerdict_1 = require("../pipeline/runVerdict");
const sandbox_1 = require("../pipeline/sandbox");
const engramClient_1 = require("../../memory/engramClient");
async function runVerdictPhase(input) {
    fs_1.default.mkdirSync(input.aiLogsDir, { recursive: true });
    const successPath = path_1.default.join(input.aiLogsDir, "success.json");
    const successRecord = {
        feature: input.feature,
        mode: input.mode,
        filesGenerated: input.generatedFiles.length,
        risk: input.impactRisk,
        timestamp: new Date().toISOString(),
    };
    const existing = fs_1.default.existsSync(successPath)
        ? JSON.parse(fs_1.default.readFileSync(successPath, "utf-8"))
        : [];
    existing.push(successRecord);
    fs_1.default.writeFileSync(successPath, JSON.stringify(existing, null, 2));
    const handlerRealism = (0, handlerInspector_1.detectHandlersRealism)(input.generatedFiles);
    input.signals.backendRealHandler = handlerRealism.anyReal;
    await (0, engramClient_1.rememberSuccess)(input.feature, `Generado (modo=${input.mode}) con ${input.backendReady} back y ${input.frontendReady} front.`, input.generatedFiles.length);
    const verdictReport = (0, runVerdict_1.buildVerdictReport)(input.feature, input.mode, input.signals);
    (0, sandbox_1.stampSandboxVerdict)(input.sandboxDir, verdictReport.verdict);
    (0, runVerdict_1.printVerdictReport)(verdictReport);
    (0, postRunNextSteps_1.printPostRunNextSteps)({
        feature: input.feature,
        mode: input.mode,
        backendReady: input.backendReady,
        frontendReady: input.frontendReady,
        projectRoot: input.projectRoot
    });
    appendVerdictJsonl(input.aiLogsDir, {
        task: "verdict",
        feature: input.feature,
        mode: input.mode,
        verdict: verdictReport.verdict,
        signals: input.signals,
        date: new Date().toISOString(),
    });
    const mapped = verdictReport.verdict === "failed" ? "failed"
        : verdictReport.verdict === "stub" ? "stub"
            : verdictReport.verdict === "partial" ? "partial"
                : "real";
    return { verdict: mapped, detail: verdictReport.headline };
}
exports.runVerdictPhase = runVerdictPhase;
function appendVerdictJsonl(logsDir, data) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
    fs_1.default.appendFileSync(path_1.default.join(logsDir, "verdicts.jsonl"), JSON.stringify(data) + "\n");
}
