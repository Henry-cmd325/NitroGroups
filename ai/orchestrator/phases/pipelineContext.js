"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHalt = void 0;
function isHalt(result) {
    return result.halt === true;
}
exports.isHalt = isHalt;
