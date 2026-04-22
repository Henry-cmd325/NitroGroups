import { LLMProvider } from "./types";
import { createGroqProvider } from "./groqProvider";
import { createCerebrasProvider } from "./cerebrasProvider";
import { createGeminiProvider } from "./geminiProvider";
import { createOllamaProvider } from "./ollamaProvider";

const DEFAULT_ORDER = ["groq", "cerebras", "gemini", "ollama"];

function buildAllProviders(): Record<string, LLMProvider> {
    return {
        groq: createGroqProvider(),
        cerebras: createCerebrasProvider(),
        gemini: createGeminiProvider(),
        ollama: createOllamaProvider()
    };
}

export function getConfiguredProviderChain(): LLMProvider[] {
    const providers = buildAllProviders();
    const order = (process.env.AI_PROVIDER_ORDER || DEFAULT_ORDER.join(","))
        .split(",")
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);

    const chain: LLMProvider[] = [];
    for (const name of order) {
        const provider = providers[name];
        if (!provider) {
            console.warn(`⚠️  Proveedor desconocido en AI_PROVIDER_ORDER: '${name}' (ignorado).`);
            continue;
        }
        if (!provider.isConfigured()) continue;
        chain.push(provider);
    }
    return chain;
}

export function describeChain(chain: LLMProvider[]): string {
    if (chain.length === 0) return "(vacía)";
    return chain.map(p => `${p.name}[${p.models.length}]`).join(" → ");
}
