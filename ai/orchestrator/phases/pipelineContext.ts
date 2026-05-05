/**
 * `PipelineContext` — estado central del orquestador durante un run.
 *
 * La estrategia de refactor de v1.2 separa `generateFeature.ts` en fases
 * independientes, cada una operando sobre este contexto. Reglas:
 *
 *  - Cada fase recibe un `PipelineContext` y devuelve una extensión.
 *    Conceptualmente inmutable: una fase NO debe mutar propiedades
 *    existentes, solo agregarlas.
 *  - Las fases pueden cortar el pipeline devolviendo un `PhaseHalt` que
 *    indica por qué se detuvo (drift, user cancelled, error fatal).
 *  - La fase final consolida `signals` → `RunVerdict` → exit code.
 *
 * Por ahora solo está el shape base; las fases se migran una por una en
 * sesiones posteriores. Ver `ai/docs/PLAN_V1_2.md` §2 para el plan completo.
 */

import type { OrchestratorMode, FileOutput, B2BContract } from "../types";
import type { RunSignals } from "../pipeline/runVerdict";

export interface PipelineBaseContext {
    feature: string;
    mode: OrchestratorMode;
    projectRoot: string;
    contract: B2BContract;
    signals: RunSignals;
    /** UTC ISO del inicio del run. Útil para sandbox, logs, memoria. */
    startedAt: string;
    dryRun: boolean;
}

export interface PipelineModuleContext extends PipelineBaseContext {
    /** Nombre del módulo backend resuelto (Schedules, Auth, etc.) o null si no aplica. */
    moduleName: string | null;
    /** Contexto de dominio extraído (entidades/enum/props). Puede ser null si el módulo no se pudo introspectar. */
    domainContext: string | null;
}

export interface PipelineGenerationContext extends PipelineModuleContext {
    generatedFiles: FileOutput[];
    /** Lecciones de memoria inyectadas al prompt. */
    lessons: {
        backend: string;   // bloque ya formateado para inyección
        frontend: string;
    };
}

/**
 * Resultado de una fase que PUEDE detener el pipeline tempranamente.
 * Cuando `halt === true`, el orquestador emite el verdict correspondiente
 * (usualmente `aborted` o `failed`) y devuelve sin seguir.
 */
export interface PhaseHalt {
    halt: true;
    reason: "aborted-by-user" | "drift" | "fatal-error" | "contract-missing" | "invalid-mode";
    detail?: string;
}

export interface PhaseOk<T> {
    halt?: false;
    context: T;
}

export type PhaseResult<T> = PhaseHalt | PhaseOk<T>;

export function isHalt<T>(result: PhaseResult<T>): result is PhaseHalt {
    return (result as PhaseHalt).halt === true;
}
