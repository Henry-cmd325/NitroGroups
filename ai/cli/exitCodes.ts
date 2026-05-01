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

export const ExitCodes = {
    OK: 0,
    CLI_USAGE: 1,
    PARTIAL: 2,
    STUB: 3,
    FAILED: 4,
    ABORTED: 5,
    UNEXPECTED: 10
} as const;

export type OrchestratorVerdict = "real" | "partial" | "stub" | "failed" | "aborted" | "dry-run";

export function verdictToExitCode(verdict: OrchestratorVerdict): number {
    switch (verdict) {
        case "real": return ExitCodes.OK;
        case "dry-run": return ExitCodes.OK;
        case "partial": return ExitCodes.PARTIAL;
        case "stub": return ExitCodes.STUB;
        case "failed": return ExitCodes.FAILED;
        case "aborted": return ExitCodes.ABORTED;
        default: return ExitCodes.UNEXPECTED;
    }
}
