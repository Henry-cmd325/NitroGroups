"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeMode = exports.parseMode = exports.getModeConfig = void 0;
const MODES = {
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
function getModeConfig(mode) {
    return MODES[mode];
}
exports.getModeConfig = getModeConfig;
function parseMode(value) {
    const normalized = (value || "").trim().toLowerCase();
    if (normalized === "frontend-only" || normalized === "fe")
        return "frontend-only";
    if (normalized === "contract-only" || normalized === "draft")
        return "contract-only";
    return "full-stack";
}
exports.parseMode = parseMode;
function describeMode(mode) {
    switch (mode) {
        case "frontend-only": return "Solo genera UI frontend (útil cuando el backend ya existe).";
        case "contract-only": return "Solo produce/ajusta el contrato B2B sin tocar código.";
        default: return "Genera backend + frontend respetando el contrato B2B.";
    }
}
exports.describeMode = describeMode;
