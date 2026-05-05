/**
 * Fase — Impact analysis.
 *
 * Corre `runImpactAnalysis` sobre el contrato y decide si avisar al usuario
 * (riesgo alto → confirmación interactiva). También formatea el log con el
 * emoji de riesgo consistente.
 *
 * Extraída de `generateFeature.ts` en el refactor v1.2.
 * Dependencia interactiva: `confirmAction`. En dry-run debe saltarse.
 */

import { runImpactAnalysis } from "../../utils/contextExtractor";
import { confirmAction } from "../../utils/diffViewer";
import type { B2BContract } from "../types";

export interface ImpactPhaseInput {
    feature: string;
    contract: B2BContract;
    /** Si true, salta la confirmación interactiva (útil para dry-run y tests). */
    nonInteractive?: boolean;
}

export interface ImpactPhaseResult {
    risk: "LOW" | "MEDIUM" | "HIGH";
    filesAffected: string[];
    /** true si el usuario canceló en riesgo alto. */
    aborted: boolean;
}

export async function runImpactPhase(input: ImpactPhaseInput): Promise<ImpactPhaseResult> {
    console.log(`[🔎] Analizando impacto en Core/ y UI/...`);
    const impact = runImpactAnalysis(input.feature, input.contract);
    const riskLabel =
        impact.risk === "HIGH" ? "🔴 ALTO" :
        impact.risk === "MEDIUM" ? "🟡 MEDIO" :
        "🟢 BAJO";
    console.log(`   Riesgo: ${riskLabel} (${impact.files.length} archivos afectados)`);

    let aborted = false;
    if (impact.risk === "HIGH" && !input.nonInteractive) {
        const proceed = await confirmAction(
            "\n🔴 RIESGO ALTO: Este cambio afecta múltiples archivos. ¿Continuar?"
        );
        if (!proceed) aborted = true;
    }

    return {
        risk: impact.risk,
        filesAffected: impact.files,
        aborted,
    };
}
