import { OpenAICompatibleProvider } from "./openAICompatibleBase";

/**
 * Comprueba si el id de modelo es la familia v4 (API unificada con `thinking` / `reasoning_effort`).
 * @see https://api-docs.deepseek.com/ — modelos: deepseek-v4-flash, deepseek-v4-pro
 */
function isV4Model(model: string): boolean {
    return model === "deepseek-v4-flash" || model === "deepseek-v4-pro";
}

/**
 * Los alias legacy `deepseek-chat` / `deepseek-reasoner` se discontinúan el 2026-07-24 (ver changelog
 * DeepSeek). Por defecto usamos `deepseek-v4-pro`; aún puedes fijar `DEEPSEEK_MODELS` a los alias viejos.
 * @see https://api-docs.deepseek.com/updates/
 */
function isLegacyReasonerModel(model: string): boolean {
    return model === "deepseek-reasoner";
}

/**
 * API compatible OpenAI: https://api.deepseek.com
 *
 * Ajustes alineados con la documentación:
 * - **V4** (`deepseek-v4-flash` / `deepseek-v4-pro`) con `DEEPSEEK_V4_THINKING` distinto de `0`:
 *   `thinking: { type: "enabled" }`, `reasoning_effort: "high"`; salida final en `message.content`.
 *   {@link https://api-docs.deepseek.com/guides/thinking_mode }
 * - **Legacy** `deepseek-reasoner`: sin `temperature` (misma API).
 * - Modo sin thinking (p. ej. `deepseek-chat` o v4 con `DEEPSEEK_V4_THINKING=0`): se envía `temperature`.
 */
export function createDeepseekProvider(): OpenAICompatibleProvider {
    const apiKey = process.env.DEEPSEEK_API_KEY || "";
    const v4Thinking = process.env.DEEPSEEK_V4_THINKING !== "0";

    const models = (process.env.DEEPSEEK_MODELS || "deepseek-v4-pro")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    return new OpenAICompatibleProvider({
        name: "deepseek",
        apiKey,
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
        models,
        shouldOmitTemperatureForModel: (model: string) => {
            if (isLegacyReasonerModel(model)) return true;
            if (isV4Model(model) && v4Thinking) return true;
            return false;
        },
        extraChatCompletionFieldsForModel: (model: string) => {
            if (isV4Model(model) && v4Thinking) {
                return {
                    thinking: { type: "enabled" as const },
                    reasoning_effort: "high" as const
                };
            }
            return undefined;
        }
    });
}
