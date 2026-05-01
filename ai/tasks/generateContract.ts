import path from "path";
import { generateContractFromEntity, writeContractFile } from "../orchestrator/contract/contractFromEntity";
import { confirmAction } from "../utils/diffViewer";

type Operation = "list" | "get-by-id" | "create" | "update" | "delete";

export interface GenerateContractOptions {
    entity: string;
    feature?: string;
    module?: string;
    operation: Operation;
    force: boolean;
    dryRun: boolean;
}

export async function generateContract(options: GenerateContractOptions): Promise<void> {
    console.log(`\n📄 Generando contrato B2B desde entidad '${options.entity}' (op=${options.operation}).`);

    let result;
    try {
        result = generateContractFromEntity(options.entity, {
            feature: options.feature,
            module: options.module,
            operation: options.operation,
            excludeAudit: true,
            projectRoot: process.cwd()
        });
    } catch (error: any) {
        console.error(`\n💥 ${error?.message || "Error desconocido generando contrato."}`);
        return;
    }

    const { contract, entity, notes } = result;

    console.log(`\nEntidad resuelta: ${entity.entityName} (${entity.namespace || "?"})`);
    console.log(`Propiedades detectadas: ${entity.properties.length} (incluye ancestros).`);
    console.log(`Campos mapeados al contrato: ${Object.keys(contract.methods[0].response?.fields || {}).length}`);
    if (notes.length > 0) {
        console.log(`\nNotas del generador:`);
        notes.forEach(n => console.log(`   • ${n}`));
    }

    console.log(`\nContrato resultante:`);
    console.log(JSON.stringify(contract, null, 2));

    if (options.dryRun) {
        console.log(`\n--dry-run activo. No se escribe archivo.`);
        return;
    }

    const proceed = await confirmAction(`\n¿Escribir contrato a ai/contracts/b2b/${contract.feature}.contract.json?`);
    if (!proceed) {
        console.log("❌ Operación abortada.");
        return;
    }

    try {
        const { path: filePath, existed } = writeContractFile(contract, process.cwd(), options.force);
        console.log(`${existed ? "♻️  Sobrescrito" : "🆕 Creado"}: ${path.relative(process.cwd(), filePath)}`);
    } catch (error: any) {
        console.error(`\n💥 ${error?.message}`);
        console.error(`   Reintenta con --force si quieres sobrescribir.`);
    }
}
