"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const types_1 = require("./types");
function parseDurationTokenToMs(token) {
    const match = token.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
    if (!match)
        return null;
    const value = parseFloat(match[1]);
    const unit = match[2];
    if (unit === "ms")
        return Math.floor(value);
    if (unit === "s")
        return Math.floor(value * 1000);
    if (unit === "m")
        return Math.floor(value * 60_000);
    if (unit === "h")
        return Math.floor(value * 3_600_000);
    return null;
}
function parseRetryAfterFromMessage(message) {
    let total = 0;
    let found = false;
    const durationMatches = (message || "").matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g);
    for (const match of durationMatches) {
        const ms = parseDurationTokenToMs(`${match[1]}${match[2]}`);
        if (ms !== null) {
            total += ms;
            found = true;
        }
    }
    return found ? total : null;
}
function extractRetryAfterMs(error) {
    const header = Number(error?.headers?.["retry-after"] || error?.headers?.get?.("retry-after"));
    if (!Number.isNaN(header) && header > 0)
        return header * 1000;
    const fromMessage = parseRetryAfterFromMessage(error?.error?.message || error?.message || "");
    return fromMessage ?? undefined;
}
function isRateLimitLike(error) {
    const status = error?.status || error?.statusCode;
    const code = (error?.code || error?.error?.code || "").toString().toLowerCase();
    const message = (error?.message || error?.error?.message || "").toString().toLowerCase();
    return status === 429 || code.includes("rate_limit") || message.includes("rate limit") || message.includes("quota");
}
/**
 * Base para proveedores con API compatible OpenAI (Groq, Cerebras, Gemini OpenAI-compat, Ollama...).
 */
class OpenAICompatibleProvider {
    name;
    models;
    client = null;
    config;
    constructor(config) {
        this.name = config.name;
        this.models = config.models;
        this.config = config;
    }
    isConfigured() {
        if (this.models.length === 0)
            return false;
        if (this.config.requireApiKey !== false) {
            return !!this.config.apiKey && this.config.apiKey !== "MISSING";
        }
        return true;
    }
    getClient() {
        if (!this.client) {
            this.client = new openai_1.default({
                apiKey: this.config.apiKey || "local",
                baseURL: this.config.baseURL,
                timeout: this.config.timeoutMs
            });
        }
        return this.client;
    }
    async generate(model, options) {
        try {
            const omitTemp = this.config.shouldOmitTemperatureForModel?.(model) === true;
            const extra = this.config.extraChatCompletionFieldsForModel?.(model) ?? {};
            const requestBody = {
                model,
                messages: [
                    { role: "system", content: options.systemPrompt },
                    { role: "user", content: options.userPrompt }
                ],
                ...extra
            };
            if (!omitTemp) {
                requestBody.temperature = options.temperature ?? this.config.temperatureOverride ?? 0.1;
            }
            // Cuerpos con extensiones de proveedor (p. ej. `thinking` en DeepSeek v4) no están en el tipo canónico de OpenAI.
            const response = await this.getClient().chat.completions.create(requestBody);
            const message = response.choices[0]?.message;
            const out = (message?.content ?? "").trim();
            if (process.env.AI_LOG_DEEPSEEK === "1" && this.name === "deepseek" && message?.reasoning_content) {
                const rc = message.reasoning_content;
                console.log(`   [deepseek] model=${model} CoT_chars=${String(rc).length} answer_chars=${out.length} (el orquestador usa solo content, la respuesta final)`);
            }
            return out;
        }
        catch (error) {
            if (isRateLimitLike(error)) {
                throw new types_1.RateLimitError(this.name, model, error?.error?.message || error?.message || "rate limit", extractRetryAfterMs(error));
            }
            throw error;
        }
    }
    async ping() {
        try {
            // Simple: si está configurado y tenemos URL, asumimos alcanzable.
            // La verdad llega en generate(). Ping fuerte usaría un HEAD a /v1/models.
            const url = new URL(this.config.baseURL);
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`${url.origin}${url.pathname.replace(/\/$/, "")}/models`, {
                method: "GET",
                signal: controller.signal,
                headers: this.config.apiKey && this.config.apiKey !== "local"
                    ? { Authorization: `Bearer ${this.config.apiKey}` }
                    : undefined
            });
            clearTimeout(timer);
            return res.status < 500;
        }
        catch {
            return false;
        }
    }
}
exports.OpenAICompatibleProvider = OpenAICompatibleProvider;
