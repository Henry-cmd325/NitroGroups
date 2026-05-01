"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroqProvider = void 0;
const openAICompatibleBase_1 = require("./openAICompatibleBase");
function parseList(value, fallback) {
    if (!value)
        return fallback;
    const parsed = value.split(",").map(x => x.trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : fallback;
}
function createGroqProvider() {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
    const defaultModels = [
        process.env.OPENAI_MODEL || "llama-3.3-70b-versatile",
        ...(process.env.OPENAI_FALLBACK_MODELS || "qwen/qwen3-32b,llama-3.1-8b-instant").split(",").map(x => x.trim()).filter(Boolean)
    ];
    const models = parseList(process.env.GROQ_MODELS, defaultModels);
    return new openAICompatibleBase_1.OpenAICompatibleProvider({
        name: "groq",
        apiKey,
        baseURL: process.env.GROQ_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1",
        models: Array.from(new Set(models))
    });
}
exports.createGroqProvider = createGroqProvider;
