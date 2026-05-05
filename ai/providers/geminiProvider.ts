import { OpenAICompatibleProvider } from "./openAICompatibleBase";

export function createGeminiProvider(): OpenAICompatibleProvider {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const models = (process.env.GEMINI_MODELS || "gemini-1.5-flash-latest,gemini-1.5-flash-8b-latest,gemini-1.5-pro-latest")
        .split(",").map(x => x.trim()).filter(Boolean);

    return new OpenAICompatibleProvider({
        name: "gemini",
        apiKey,
        baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
        models
    });
}
