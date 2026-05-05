"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeepseekProvider = void 0;
const openAICompatibleBase_1 = require("./openAICompatibleBase");
/**
 * Comprueba si el id de modelo es la familia v4 (API unificada con `thinking` / `reasoning_effort`).
 * @see https://api-docs.deepseek.com/ — modelos: deepseek-v4-flash, deepseek-v4-pro
 */
function isV4Model(model) {
    return model === "deepseek-v4-flash" || model === "deepseek-v4-pro";
}
/**
 * Los alias legacy `deepseek-chat` / `deepseek-reasoner` se discontinúan el 2026-07-24.
 * Por defecto: `deepseek-v4-pro`. @see https://api-docs.deepseek.com/updates/
 */
function isLegacyReasonerModel(model) {
    return model === "deepseek-reasoner";
}
/**
 * API compatible OpenAI: https://api.deepseek.com — v4 thinking por defecto; ver guía thinking_mode.
 */
function createDeepseekProvider() {
    const apiKey = process.env.DEEPSEEK_API_KEY || "";
    const v4Thinking = process.env.DEEPSEEK_V4_THINKING !== "0";
    const models = (process.env.DEEPSEEK_MODELS || "deepseek-v4-pro")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);
    return new openAICompatibleBase_1.OpenAICompatibleProvider({
        name: "deepseek",
        apiKey,
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
        models,
        shouldOmitTemperatureForModel: (model) => {
            if (isLegacyReasonerModel(model))
                return true;
            if (isV4Model(model) && v4Thinking)
                return true;
            return false;
        },
        extraChatCompletionFieldsForModel: (model) => {
            if (isV4Model(model) && v4Thinking) {
                return {
                    thinking: { type: "enabled" },
                    reasoning_effort: "high"
                };
            }
            return undefined;
        }
    });
}
exports.createDeepseekProvider = createDeepseekProvider;
