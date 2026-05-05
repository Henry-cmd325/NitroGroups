/**
 * Cuestionario breve de negocio **antes** de FASE B (generación de código).
 *
 * El orquestador no sustituye un PRD, pero hoy a menudo se “pasaba” a código sin
 * que el operador asumiera el contrato. Esta fase obliga a confirmar criterio
 * explícito, máx. cuando un GET/list no declara criterio en `request` (fuga
 * de datos frecuente al derivar listados desde entidad).
 *
 * `dryRun` o CI con flujo no interactivo: se omite (pasa directo).
 */

import { confirmAction } from "../../utils/diffViewer";
import type { B2BContract } from "../types";

export interface PreCodegenElicitationInput {
    feature: string;
    contract: B2BContract;
    /** Si true, no pregunta (p. ej. `generate-feature --dry-run`, tests). */
    dryRun: boolean;
}

function hasListGetWithoutRequestCriteria(contract: B2BContract): boolean {
    for (const m of contract.methods || []) {
        if ((m.http || "").toUpperCase() !== "GET") continue;
        const n = (m.name || "").toLowerCase();
        if (!n.includes("list") && !n.startsWith("list")) continue;
        const fields = m.request?.fields;
        if (!fields || Object.keys(fields).length === 0) return true;
    }
    return false;
}

export async function runPreCodegenElicitationPhase(
    input: PreCodegenElicitationInput
): Promise<{ proceed: boolean }> {
    if (input.dryRun) {
        return { proceed: true };
    }

    console.log(`\n📋 ═══ Cuestionario de negocio (antes de generar código) ═══`);
    console.log(
        "   FASE A (drafting) o la derivación desde entidad rellenan un JSON; " +
            "frecuentemente aún faltan filtros, permisos o alcance. " +
            "Responde con honestidad — si no, el código nacerá con fallos estructurales.\n"
    );

    const reviewed = await confirmAction(
        `1) ¿Revisé o edité "ai/contracts/b2b/${input.feature}.contract.json" ` +
            `para que refleje alcance, filtros y acceso (p. ej. qué listados son permisibles)?`
    );
    if (!reviewed) {
        console.log(
            "\n↩️  Pausado. Ajusta el contrato, guarda, y re-ejecuta:\n" +
            `   npm run ai -- generate-feature ${input.feature} --mode=full-stack\n`
        );
        return { proceed: false };
    }

    if (hasListGetWithoutRequestCriteria(input.contract)) {
        const acceptScope = await confirmAction(
            "2) El contrato incluye al menos un GET de tipo *list* **sin** `request.fields` " +
                "(criterio vacío). En backend eso tiende a “traer toda la tabla” y puede ser " +
                "una fuga. ¿Acepta negocio ese diseño, o añadirás criterio al contrato tras este run?"
        );
        if (!acceptScope) {
            console.log(
                "\n↩️  Pausado. Añade campos a `request` (p. ej. groupId) o ajusta el contrato, " +
                    "y vuelve a ejecutar `generate-feature`.\n"
            );
            return { proceed: false };
        }
    }

    console.log(`   ✔️ Cuestionario aceptado — continuando a generación de código.`);
    return { proceed: true };
}
