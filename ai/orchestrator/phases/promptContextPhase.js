"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPromptLessonSummary = exports.buildPromptLessonContext = void 0;
const errorDigest_1 = require("../../memory/errorDigest");
const stackPlaybook_1 = require("../../memory/stackPlaybook");
/**
 * @param pastDecisions — `recallDecisions(feature)` desde Engram; puede ser [].
 * @param pastErrors — `recallErrors(feature)`; opcional, default [].
 */
function buildPromptLessonContext(feature, pastDecisions, pastErrors = []) {
    const backendLessons = (0, errorDigest_1.digestLessons)({ feature, layer: "backend", limit: 5 });
    const frontendLessons = (0, errorDigest_1.digestLessons)({ feature, layer: "frontend", limit: 5 });
    const contractLessons = (0, errorDigest_1.digestLessons)({ feature, layer: "contract", limit: 3 });
    const digestMarkdown = (0, errorDigest_1.formatLessonsForPrompt)([...backendLessons, ...frontendLessons, ...contractLessons]);
    const { block: recallBlock, usedCount: recalledUsed } = (0, errorDigest_1.formatRecalledExperiencesForPrompt)(pastErrors, digestMarkdown.toLowerCase());
    const backendLessonBlock = (0, errorDigest_1.formatLessonsForPrompt)([...backendLessons, ...contractLessons]) +
        recallBlock +
        (0, stackPlaybook_1.getStackPlaybookBackend)();
    const frontendLessonBlock = (0, errorDigest_1.formatLessonsForPrompt)([...frontendLessons, ...contractLessons]) +
        recallBlock +
        (0, stackPlaybook_1.getStackPlaybookFrontend)();
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
exports.buildPromptLessonContext = buildPromptLessonContext;
function logPromptLessonSummary(counts) {
    const digestTotal = counts.backend + counts.frontend + counts.contract;
    if (digestTotal > 0 || counts.recalled > 0) {
        const recallPart = counts.recalled > 0 ? `, ${counts.recalled} recall (Engram/experiencia)` : "";
        console.log(`🧠 Memoria activa: ${counts.backend} digest backend, ${counts.frontend} digest frontend, ${counts.contract} digest contrato${recallPart} — inyectado al prompt.`);
    }
}
exports.logPromptLessonSummary = logPromptLessonSummary;
