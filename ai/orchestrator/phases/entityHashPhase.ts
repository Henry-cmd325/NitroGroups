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

import fs from "fs";

import { validateContractVsEntity } from "../../validators/b2bValidator";
import { calculateSemanticHash } from "../../utils/contextExtractor";
import type { B2BContract } from "../types";

export type EntityHashPhaseResult =
    | { outcome: "continue" }
    /** Contrato actualizado y persistido; el caller debe terminar sin generar. */
    | { outcome: "hash-updated"; newHash: string }
    | { outcome: "drift"; contractHash: string; currentHash: string }
    | { outcome: "entity-mismatch"; errors: string[] };

export function runEntityHashPhase(options: {
    contract: B2BContract;
    contractPath: string;
    domainContext: string | null;
    generateBackend: boolean;
    updateHash?: boolean;
}): EntityHashPhaseResult {
    const { contract, contractPath, domainContext, generateBackend, updateHash } = options;

    if (!domainContext || !generateBackend) {
        return { outcome: "continue" };
    }

    const currentHash = calculateSemanticHash(domainContext);

    if (updateHash) {
        contract.entityHash = currentHash;
        fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
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
    const entityValidation = validateContractVsEntity(contract, domainContext);
    entityValidation.warnings.forEach(w => console.warn(`   → ${w}`));
    if (!entityValidation.isValid) {
        console.error(`\n💥 INCOMPATIBILIDAD CRÍTICA Contrato ↔ Entidad:`);
        entityValidation.errors.forEach(e => console.error(`   ❌ ${e}`));
        return { outcome: "entity-mismatch", errors: entityValidation.errors };
    }
    console.log(`✅ Contrato y Entidad son compatibles.`);

    return { outcome: "continue" };
}

export function reportEntityHashDrift(
    feature: string,
    result: Extract<EntityHashPhaseResult, { outcome: "drift" }>
): void {
    console.error(`\n💥 DRIFT DETECTADO`);
    console.error(`   Contrato: ${result.contractHash}`);
    console.error(`   Actual:   ${result.currentHash}`);
    console.error(`   → Usa 'npm run ai generate-feature ${feature} --update-hash' si es intencional.\n`);
}
