/**
 * Fase — Contexto inyectable en los prompts (lecciones Engram + decisiones).
 *
 * Las lecciones se calculan por capa (backend / frontend / contract) para
 * no mezclar ruido entre capas. Los bloques `backendLessonBlock` y
 * `frontendLessonBlock` ya incluyen la porción de contrato compartida
 * (contract + las capas no se cruzan).
 *
 * Ver refactor v1.2 — Sesión 3.
 */

import { digestLessons, formatLessonsForPrompt, formatRecalledExperiencesForPrompt } from "../../memory/errorDigest";
import { getStackPlaybookBackend, getStackPlaybookFrontend } from "../../memory/stackPlaybook";

export interface PromptLessonContext {
    backendLessonBlock: string;
    frontendLessonBlock: string;
    /** Bloque a anexar a ambos prompts (Engram: decisiones arquitectónicas). */
    decisionContextTemplate: string;
    /** Contadores solo para un log informativo en el caller. */
    lessonCounts: { backend: number; frontend: number; contract: number; recalled: number };
}

/**
 * @param pastDecisions — `recallDecisions(feature)` desde Engram; puede ser [].
 * @param pastErrors — `recallErrors(feature)` desde Engram; se fusiona con el digest local sin duplicar ruido.
 */
export function buildPromptLessonContext(
    feature: string,
    pastDecisions: string[],
    pastErrors: string[] = []
): PromptLessonContext {
    const backendLessons = digestLessons({ feature, layer: "backend", limit: 5 });
    const frontendLessons = digestLessons({ feature, layer: "frontend", limit: 5 });
    const contractLessons = digestLessons({ feature, layer: "contract", limit: 3 });

    const digestMarkdown = formatLessonsForPrompt([...backendLessons, ...frontendLessons, ...contractLessons]);
    const { block: recallBlock, usedCount: recalledUsed } = formatRecalledExperiencesForPrompt(
        pastErrors,
        digestMarkdown.toLowerCase()
    );

    const backendLessonBlock =
        formatLessonsForPrompt([...backendLessons, ...contractLessons]) +
        recallBlock +
        getStackPlaybookBackend();
    const frontendLessonBlock =
        formatLessonsForPrompt([...frontendLessons, ...contractLessons]) +
        recallBlock +
        getStackPlaybookFrontend();

    const decisionContextTemplate = pastDecisions.length > 0
        ? `\n\n=== DECISIONES ARQUITECTÓNICAS ===\n${pastDecisions.join("\n")}`
        : "";

    return {
        backendLessonBlock,
        frontendLessonBlock,
        decisionContextTemplate,
        lessonCounts: {
            backend: backendLessons.length,
            frontend: frontendLessons.length,
            contract: contractLessons.length,
            recalled: recalledUsed
        }
    };
}

export function logPromptLessonSummary(counts: PromptLessonContext["lessonCounts"]): void {
    const digestTotal = counts.backend + counts.frontend + counts.contract;
    if (digestTotal > 0 || counts.recalled > 0) {
        const recallPart =
            counts.recalled > 0 ? `, ${counts.recalled} recall (Engram/experiencia)` : "";
        console.log(
            `🧠 Memoria activa: ${counts.backend} digest backend, ${counts.frontend} digest frontend, ${counts.contract} digest contrato${recallPart} — inyectado al prompt.`
        );
    }
}
