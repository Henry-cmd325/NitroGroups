import { OpenAICompatibleProvider } from "./openAICompatibleBase";

export function createCerebrasProvider(): OpenAICompatibleProvider {
    const apiKey = process.env.CEREBRAS_API_KEY || "";
    const models = (process.env.CEREBRAS_MODELS || "llama-3.3-70b,llama3.1-8b")
        .split(",").map(x => x.trim()).filter(Boolean);

    return new OpenAICompatibleProvider({
        name: "cerebras",
        apiKey,
        baseURL: process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1",
        models
    });
}
