"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runImpactPhase = void 0;
const contextExtractor_1 = require("../../utils/contextExtractor");
const diffViewer_1 = require("../../utils/diffViewer");
async function runImpactPhase(input) {
    console.log(`[🔎] Analizando impacto en Core/ y UI/...`);
    const impact = (0, contextExtractor_1.runImpactAnalysis)(input.feature, input.contract);
    const riskLabel = impact.risk === "HIGH" ? "🔴 ALTO" :
        impact.risk === "MEDIUM" ? "🟡 MEDIO" :
            "🟢 BAJO";
    console.log(`   Riesgo: ${riskLabel} (${impact.files.length} archivos afectados)`);
    let aborted = false;
    if (impact.risk === "HIGH" && !input.nonInteractive) {
        const proceed = await (0, diffViewer_1.confirmAction)("\n🔴 RIESGO ALTO: Este cambio afecta múltiples archivos. ¿Continuar?");
        if (!proceed)
            aborted = true;
    }
    return {
        risk: impact.risk,
        filesAffected: impact.files,
        aborted,
    };
}
exports.runImpactPhase = runImpactPhase;
