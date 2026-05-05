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

import fs from "fs";
import path from "path";

import { detectHandlersRealism } from "../pipeline/handlerInspector";
import { printPostRunNextSteps } from "../pipeline/postRunNextSteps";
import { buildVerdictReport, printVerdictReport, type RunSignals } from "../pipeline/runVerdict";
import { stampSandboxVerdict } from "../pipeline/sandbox";
import { rememberSuccess } from "../../memory/engramClient";
import type { FileOutput, OrchestratorMode } from "../types";

export type VerdictPhaseVerdict = "real" | "partial" | "stub" | "failed";

export interface VerdictPhaseInput {
    feature: string;
    mode: OrchestratorMode;
    signals: RunSignals;
    sandboxDir: string;
    generatedFiles: FileOutput[];
    backendReady: number;
    frontendReady: number;
    impactRisk: "LOW" | "MEDIUM" | "HIGH";
    /** Directorio raíz de `ai/` para escribir logs. Normalmente `path.join(__dirname, "../logs")` desde `ai/tasks/`. */
    aiLogsDir: string;
    /** Raíz del monorepo (para leer contrato / requirements en checklist post-run). */
    projectRoot: string;
}

export interface VerdictPhaseResult {
    verdict: VerdictPhaseVerdict;
    detail: string;
}

export async function runVerdictPhase(input: VerdictPhaseInput): Promise<VerdictPhaseResult> {
    fs.mkdirSync(input.aiLogsDir, { recursive: true });

    const successPath = path.join(input.aiLogsDir, "success.json");
    const successRecord = {
        feature: input.feature,
        mode: input.mode,
        filesGenerated: input.generatedFiles.length,
        risk: input.impactRisk,
        timestamp: new Date().toISOString(),
    };
    const existing = fs.existsSync(successPath)
        ? JSON.parse(fs.readFileSync(successPath, "utf-8"))
        : [];
    existing.push(successRecord);
    fs.writeFileSync(successPath, JSON.stringify(existing, null, 2));

    const handlerRealism = detectHandlersRealism(input.generatedFiles);
    input.signals.backendRealHandler = handlerRealism.anyReal;

    await rememberSuccess(
        input.feature,
        `Generado (modo=${input.mode}) con ${input.backendReady} back y ${input.frontendReady} front.`,
        input.generatedFiles.length
    );

    const verdictReport = buildVerdictReport(input.feature, input.mode, input.signals);
    stampSandboxVerdict(input.sandboxDir, verdictReport.verdict);
    printVerdictReport(verdictReport);

    printPostRunNextSteps({
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

    const mapped: VerdictPhaseVerdict =
        verdictReport.verdict === "failed" ? "failed"
        : verdictReport.verdict === "stub" ? "stub"
        : verdictReport.verdict === "partial" ? "partial"
        : "real";

    return { verdict: mapped, detail: verdictReport.headline };
}

function appendVerdictJsonl(logsDir: string, data: unknown): void {
    fs.mkdirSync(logsDir, { recursive: true });
    fs.appendFileSync(path.join(logsDir, "verdicts.jsonl"), JSON.stringify(data) + "\n");
}
