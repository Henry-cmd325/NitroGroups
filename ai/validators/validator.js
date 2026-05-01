"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateServiceOutput = exports.validateContractIntegrity = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function validateContractIntegrity() {
    const contractPath = path_1.default.join(__dirname, "../contracts/service.contract.json");
    if (!fs_1.default.existsSync(contractPath)) {
        throw new Error("🚨 CONTRATO PERDIDO: No se encontró 'service.contract.json'. La IA no puede operar sin reglas arquitectónicas.");
    }
    const contract = JSON.parse(fs_1.default.readFileSync(contractPath, "utf-8"));
    if (!contract.imports?.forbidden || !contract.auth?.pattern || !contract.client?.instance) {
        throw new Error("🚨 CONTRATO CORRUPTO: 'service.contract.json' perdió información clave (imports.forbidden, auth.pattern, client.instance).");
    }
}
exports.validateContractIntegrity = validateContractIntegrity;
function validateServiceOutput(code) {
    // 1. Cargar el contrato
    const contractPath = path_1.default.join(__dirname, "../contracts/service.contract.json");
    const contract = JSON.parse(fs_1.default.readFileSync(contractPath, "utf-8"));
    // Check forbiddens
    for (const forbidden of contract.imports.forbidden) {
        // Regex para buscar "forbidden" en la linea de forma rudimentaria
        if (new RegExp(`(?:import|require).*['"]${forbidden}['"]`).test(code) || code.includes(`${forbidden}(`)) {
            return { isValid: false, error: `Violaste contract.imports.forbidden: No debes usar '${forbidden}'` };
        }
    }
    // Check apiClient instance
    if (!code.includes(contract.client.instance)) {
        return { isValid: false, error: `Violaste contract.client.instance: No estás usando '${contract.client.instance}'` };
    }
    // Check Auth Pattern
    if (contract.auth.required) {
        // Checking for "Authorization" and "Bearer"
        if (!code.includes("Authorization") || (!code.includes("Bearer ${accessToken}") && !code.includes("Bearer ` + accessToken"))) {
            return { isValid: false, error: `Violaste contract.auth.pattern: Estructura de header incorrecta. Falta 'Authorization: Bearer \${accessToken}'` };
        }
    }
    // Comprobamos la exportacion
    if (!code.includes("export const")) {
        return { isValid: false, error: `Violaste contract.structure.mustExport: Debes usar 'export const'` };
    }
    return { isValid: true };
}
exports.validateServiceOutput = validateServiceOutput;
