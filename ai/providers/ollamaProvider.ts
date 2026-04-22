import { OpenAICompatibleProvider } from "./openAICompatibleBase";

export function createOllamaProvider(): OpenAICompatibleProvider {
    const baseURL = process.env.OLLAMA_HOST
        ? (process.env.OLLAMA_HOST.endsWith("/v1") ? process.env.OLLAMA_HOST : `${process.env.OLLAMA_HOST.replace(/\/$/, "")}/v1`)
        : "http://localhost:11434/v1";

    const models = (process.env.OLLAMA_MODELS || "qwen2.5-coder:7b-instruct")
        .split(",").map(x => x.trim()).filter(Boolean);

    return new OpenAICompatibleProvider({
        name: "ollama",
        apiKey: "local",
        baseURL,
        models,
        requireApiKey: false,
        timeoutMs: 300000 // generación local puede ser lenta
    });
}
