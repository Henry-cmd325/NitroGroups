/**
 * Veredicto honesto del run del orquestador.
 *
 * El objetivo es dejar de reportar cualquier run verde como "desplegado
 * exitosamente". Un fallback determinista activo significa que el código
 * compila y respeta la arquitectura, pero NO que el requerimiento esté
 * implementado — esa distinción vive aquí.
 */

export type RunVerdict =
    | "real"       // LLM respondió bien, no hubo fallbacks ni stubs.
    | "stub"       // Fallback determinista activo → handler mock / UI placeholder.
    | "partial"    // Solo una capa salió adelante (front o back), la otra cayó.
    | "failed";    // Rollback, quality gates definitivos o error fatal.

export interface RunSignals {
    backendRequested: boolean;
    backendLlmCalled: boolean;
    backendLlmSucceeded: boolean;
    backendDeterministicFallback: boolean;
    backendDirectedRepair: boolean;
    backendDiscarded: boolean;
    backendRealHandler: boolean; // true si al menos un handler NO es stub
    /** Se desactivó la generación .NET por Map* duplicado (mismo path que en Core existente). */
    backendSkippedForRouteConflict: boolean;

    frontendRequested: boolean;
    frontendLlmCalled: boolean;
    frontendLlmSucceeded: boolean;
    frontendDeterministicFallback: boolean;

    autoRepairRounds: number;
    qualityGatesFinalOk: boolean;
    rolledBack: boolean;
}

export function createRunSignals(): RunSignals {
    return {
        backendRequested: false,
        backendLlmCalled: false,
        backendLlmSucceeded: false,
        backendDeterministicFallback: false,
        backendDirectedRepair: false,
        backendDiscarded: false,
        backendRealHandler: false,
        backendSkippedForRouteConflict: false,

        frontendRequested: false,
        frontendLlmCalled: false,
        frontendLlmSucceeded: false,
        frontendDeterministicFallback: false,

        autoRepairRounds: 0,
        qualityGatesFinalOk: false,
        rolledBack: false
    };
}

export function computeVerdict(signals: RunSignals): RunVerdict {
    if (signals.rolledBack || !signals.qualityGatesFinalOk) return "failed";

    // Criterios por capa:
    //  - Backend "real" = hay handler con DI + repo + await (inspeccionado).
    //  - Frontend "real" = LLM devolvió algo útil (no cayó al JSON-viewer fallback).
    //  Desde v1.1, el fallback determinista del backend puede emitir handler
    //  real cuando tiene contexto del módulo; por eso `backendRealHandler` es
    //  la señal autoritativa, no la procedencia (LLM vs fallback).
    const backendReal = !signals.backendRequested || signals.backendRealHandler;
    const frontendReal = !signals.frontendRequested ||
        (signals.frontendLlmSucceeded && !signals.frontendDeterministicFallback);

    // Backend descartado → solo frontend sobrevivió (o viceversa).
    if (signals.backendRequested && signals.backendDiscarded) return "partial";

    if (backendReal && frontendReal) return "real";
    if (backendReal || frontendReal) return "partial";
    return "stub";
}

export interface VerdictReport {
    verdict: RunVerdict;
    headline: string;
    bullets: string[];
    exitAdvice: string[];
}

export function buildVerdictReport(feature: string, mode: string, signals: RunSignals): VerdictReport {
    const verdict = computeVerdict(signals);
    const bullets: string[] = [];

    if (signals.backendRequested) {
        if (signals.backendDiscarded) {
            bullets.push("Backend: descartado por errores críticos.");
        } else if (signals.backendRealHandler) {
            const origen = signals.backendDeterministicFallback ? "fallback determinista con contexto del módulo" : "generación LLM";
            bullets.push(`Backend: handler real (${origen}, inyecta UoW/repositorio).`);
        } else if (signals.backendDeterministicFallback) {
            bullets.push("Backend: fallback determinista (handler stub sin contexto disponible).");
        } else if (signals.backendLlmSucceeded) {
            bullets.push("Backend: generación LLM, pero no se detectó handler real.");
        } else {
            bullets.push("Backend: origen indeterminado.");
        }

        if (signals.backendDirectedRepair) bullets.push("Backend: se aplicó repair dirigido de DTOs.");
    }

    if (signals.frontendRequested) {
        if (signals.frontendDeterministicFallback && !signals.frontendLlmSucceeded) {
            bullets.push("Frontend: fallback determinista (panel JSON-viewer, UI real pendiente).");
        } else if (signals.frontendDeterministicFallback) {
            bullets.push("Frontend: LLM + recuperación determinista parcial.");
        } else if (signals.frontendLlmSucceeded) {
            bullets.push("Frontend: generación LLM exitosa.");
        } else {
            bullets.push("Frontend: origen indeterminado.");
        }
    }

    if (signals.autoRepairRounds > 0) {
        bullets.push(`Autocorrección IA: ${signals.autoRepairRounds} ronda(s).`);
    }

    let headline: string;
    const exitAdvice: string[] = [];

    switch (verdict) {
        case "real":
            headline = `✅ Feature '${feature}' desplegado con lógica real (modo=${mode}).`;
            break;
        case "stub":
            headline = `🟡 Feature '${feature}' desplegado como STUB (modo=${mode}).`;
            exitAdvice.push("El código compila y respeta la arquitectura, pero contiene handlers/UI placeholder.");
            exitAdvice.push("Acción sugerida: reintenta cuando los LLMs estén disponibles o revisa el contrato.");
            break;
        case "partial":
            headline = `🟠 Feature '${feature}' desplegado PARCIAL (modo=${mode}).`;
            if (signals.backendDiscarded) {
                exitAdvice.push("Solo el frontend quedó operativo. Reintenta backend por separado.");
            } else if (signals.backendRealHandler && signals.frontendDeterministicFallback) {
                exitAdvice.push("Backend real; frontend cayó a JSON-viewer (LLM no respondió).");
                exitAdvice.push("Acción sugerida: reintenta frontend-only o revisa providers LLM.");
            } else if (!signals.backendRealHandler && signals.frontendLlmSucceeded) {
                exitAdvice.push("Frontend real; backend quedó como stub (sin contexto de módulo).");
                exitAdvice.push("Acción sugerida: verifica que el módulo tenga UoW/repositorios introspectables.");
            }
            break;
        case "failed":
            headline = `🔴 Feature '${feature}' NO desplegado (modo=${mode}).`;
            break;
    }

    return { verdict, headline, bullets, exitAdvice };
}

export function printVerdictReport(report: VerdictReport): void {
    console.log(`\n${report.headline}`);
    if (report.bullets.length > 0) {
        console.log(`\nResumen:`);
        report.bullets.forEach(b => console.log(`   • ${b}`));
    }
    if (report.exitAdvice.length > 0) {
        console.log(`\nSugerencias:`);
        report.exitAdvice.forEach(a => console.log(`   → ${a}`));
    }
    console.log("");
}
