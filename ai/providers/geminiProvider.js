"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGeminiProvider = void 0;
const openAICompatibleBase_1 = require("./openAICompatibleBase");
function createGeminiProvider() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const models = (process.env.GEMINI_MODELS || "gemini-1.5-flash-latest,gemini-1.5-flash-8b-latest,gemini-1.5-pro-latest")
        .split(",").map(x => x.trim()).filter(Boolean);
    return new openAICompatibleBase_1.OpenAICompatibleProvider({
        name: "gemini",
        apiKey,
        baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
        models
    });
}
exports.createGeminiProvider = createGeminiProvider;
