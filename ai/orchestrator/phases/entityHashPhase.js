"use strict";
/**
 * Fase — Hash de entidad, drift y compatibilidad Contrato ↔ Entidad.
 *
 * - `--updateHash`: reescribe `entityHash` en el contrato y termina el run
 *   con éxito (sin generación).
 * - Drift: bloquea si el hash almacenado no coincide con el contexto
 *   semántico actual.
 * - `validateContractVsEntity` cuando aplica.
 *
 * Ver refactor v1.2 — Sesión 2.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportEntityHashDrift = exports.runEntityHashPhase = void 0;
const fs_1 = __importDefault(require("fs"));
const b2bValidator_1 = require("../../validators/b2bValidator");
const contextExtractor_1 = require("../../utils/contextExtractor");
function runEntityHashPhase(options) {
    const { contract, contractPath, domainContext, generateBackend, updateHash } = options;
    if (!domainContext || !generateBackend) {
        return { outcome: "continue" };
    }
    const currentHash = (0, contextExtractor_1.calculateSemanticHash)(domainContext);
    if (updateHash) {
        contract.entityHash = currentHash;
        fs_1.default.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
        console.log(`✅ Hash de entidad actualizado a: ${currentHash}`);
        return { outcome: "hash-updated", newHash: currentHash };
    }
    if (contract.entityHash !== "INITIAL_SIGNATURE" && contract.entityHash !== currentHash) {
        return {
            outcome: "drift",
            contractHash: String(contract.entityHash),
            currentHash
        };
    }
    console.log(`[🔍] Validando compatibilidad Contrato ↔ Entidad...`);
    const entityValidation = (0, b2bValidator_1.validateContractVsEntity)(contract, domainContext);
    entityValidation.warnings.forEach(w => console.warn(`   → ${w}`));
    if (!entityValidation.isValid) {
        console.error(`\n💥 INCOMPATIBILIDAD CRÍTICA Contrato ↔ Entidad:`);
        entityValidation.errors.forEach(e => console.error(`   ❌ ${e}`));
        return { outcome: "entity-mismatch", errors: entityValidation.errors };
    }
    console.log(`✅ Contrato y Entidad son compatibles.`);
    return { outcome: "continue" };
}
exports.runEntityHashPhase = runEntityHashPhase;
function reportEntityHashDrift(feature, result) {
    console.error(`\n💥 DRIFT DETECTADO`);
    console.error(`   Contrato: ${result.contractHash}`);
    console.error(`   Actual:   ${result.currentHash}`);
    console.error(`   → Usa 'npm run ai generate-feature ${feature} --update-hash' si es intencional.\n`);
}
exports.reportEntityHashDrift = reportEntityHashDrift;
