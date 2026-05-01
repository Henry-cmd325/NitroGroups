import { OrchestratorMode } from "../types";

export interface ModeConfig {
    generateBackend: boolean;
    generateFrontend: boolean;
    enforceBackendModule: boolean;
    validateBackendStructural: boolean;
    validateFrontendStructural: boolean;
    runDotnetBuild: boolean;
    runTypescriptCheck: boolean;
    allowContractDraftOnly: boolean;
    /**
     * Ejecuta `dotnet test` / `npm test` (config en `ai/test-gate.config.json` o env).
     * Si no hay comandos resueltos, se omite sin error.
     */
    runTestGate: boolean;
}

const MODES: Record<OrchestratorMode, ModeConfig> = {
    "full-stack": {
        generateBackend: true,
        generateFrontend: true,
        enforceBackendModule: true,
        validateBackendStructural: true,
        validateFrontendStructural: true,
        runDotnetBuild: true,
        runTypescriptCheck: true,
        allowContractDraftOnly: false,
        runTestGate: true
    },
    "frontend-only": {
        generateBackend: false,
        generateFrontend: true,
        enforceBackendModule: false,
        validateBackendStructural: false,
        validateFrontendStructural: true,
        runDotnetBuild: false,
        runTypescriptCheck: true,
        allowContractDraftOnly: false,
        runTestGate: true
    },
    "contract-only": {
        generateBackend: false,
        generateFrontend: false,
        enforceBackendModule: false,
        validateBackendStructural: false,
        validateFrontendStructural: false,
        runDotnetBuild: false,
        runTypescriptCheck: false,
        allowContractDraftOnly: true,
        runTestGate: false
    }
};

export function getModeConfig(mode: OrchestratorMode): ModeConfig {
    return MODES[mode];
}

export function parseMode(value: string | undefined): OrchestratorMode {
    const normalized = (value || "").trim().toLowerCase();
    if (normalized === "frontend-only" || normalized === "fe") return "frontend-only";
    if (normalized === "contract-only" || normalized === "draft") return "contract-only";
    return "full-stack";
}

export function describeMode(mode: OrchestratorMode): string {
    switch (mode) {
        case "frontend-only": return "Solo genera UI frontend (útil cuando el backend ya existe).";
        case "contract-only": return "Solo produce/ajusta el contrato B2B sin tocar código.";
        default: return "Genera backend + frontend respetando el contrato B2B.";
    }
}
