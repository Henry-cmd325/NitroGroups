import { OpenAICompatibleProvider } from "./openAICompatibleBase";

function parseList(value: string | undefined, fallback: string[]): string[] {
    if (!value) return fallback;
    const parsed = value.split(",").map(x => x.trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : fallback;
}

export function createGroqProvider(): OpenAICompatibleProvider {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
    const defaultModels = [
        process.env.OPENAI_MODEL || "llama-3.3-70b-versatile",
        ...(process.env.OPENAI_FALLBACK_MODELS || "qwen/qwen3-32b,llama-3.1-8b-instant").split(",").map(x => x.trim()).filter(Boolean)
    ];
    const models = parseList(process.env.GROQ_MODELS, defaultModels);

    return new OpenAICompatibleProvider({
        name: "groq",
        apiKey,
        baseURL: process.env.GROQ_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1",
        models: Array.from(new Set(models))
    });
}
