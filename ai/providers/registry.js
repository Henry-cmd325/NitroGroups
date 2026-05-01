"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeChain = exports.getConfiguredProviderChain = void 0;
const deepseekProvider_1 = require("./deepseekProvider");
const groqProvider_1 = require("./groqProvider");
const cerebrasProvider_1 = require("./cerebrasProvider");
const geminiProvider_1 = require("./geminiProvider");
const ollamaProvider_1 = require("./ollamaProvider");
/** `deepseek` va primero: si no hay clave, `isConfigured()` lo omite y sigue con el resto. */
const DEFAULT_ORDER = ["deepseek", "groq", "cerebras", "gemini", "ollama"];
function buildAllProviders() {
    return {
        deepseek: (0, deepseekProvider_1.createDeepseekProvider)(),
        groq: (0, groqProvider_1.createGroqProvider)(),
        cerebras: (0, cerebrasProvider_1.createCerebrasProvider)(),
        gemini: (0, geminiProvider_1.createGeminiProvider)(),
        ollama: (0, ollamaProvider_1.createOllamaProvider)()
    };
}
function getConfiguredProviderChain() {
    const providers = buildAllProviders();
    const order = (process.env.AI_PROVIDER_ORDER || DEFAULT_ORDER.join(","))
        .split(",")
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);
    const chain = [];
    for (const name of order) {
        const provider = providers[name];
        if (!provider) {
            console.warn(`⚠️  Proveedor desconocido en AI_PROVIDER_ORDER: '${name}' (ignorado).`);
            continue;
        }
        if (!provider.isConfigured())
            continue;
        chain.push(provider);
    }
    return chain;
}
exports.getConfiguredProviderChain = getConfiguredProviderChain;
function describeChain(chain) {
    if (chain.length === 0)
        return "(vacía)";
    return chain.map(p => `${p.name}[${p.models.length}]`).join(" → ");
}
exports.describeChain = describeChain;
