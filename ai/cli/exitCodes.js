"use strict";
/**
 * Exit codes estandarizados del orquestador.
 *
 * Semántica pensada para CI/CD (GitHub Actions, pipelines internos):
 *  - 0  → éxito total (incluye dry-run exitoso).
 *  - 1  → error de CLI (uso incorrecto, comando no reconocido).
 *  - 2  → verdict PARTIAL (una capa real, la otra fallback/placeholder).
 *  - 3  → verdict STUB (ambas capas son placeholder; compila pero no implementa).
 *  - 4  → verdict FAILED (quality gates rotos, rollback aplicado).
 *  - 5  → usuario abortó la operación.
 *  - 10 → error no controlado (throw).
 *
 * Regla práctica para CI: `exit <= 2` suele ser aceptable para merges en
 * feature branches; `exit >= 3` debe bloquear un merge a main.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verdictToExitCode = exports.ExitCodes = void 0;
exports.ExitCodes = {
    OK: 0,
    CLI_USAGE: 1,
    PARTIAL: 2,
    STUB: 3,
    FAILED: 4,
    ABORTED: 5,
    UNEXPECTED: 10
};
function verdictToExitCode(verdict) {
    switch (verdict) {
        case "real": return exports.ExitCodes.OK;
        case "dry-run": return exports.ExitCodes.OK;
        case "partial": return exports.ExitCodes.PARTIAL;
        case "stub": return exports.ExitCodes.STUB;
        case "failed": return exports.ExitCodes.FAILED;
        case "aborted": return exports.ExitCodes.ABORTED;
        default: return exports.ExitCodes.UNEXPECTED;
    }
}
exports.verdictToExitCode = verdictToExitCode;
