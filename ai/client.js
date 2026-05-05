"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCode = exports.setGenerateCodeOverride = exports.initializeAIClient = void 0;
const types_1 = require("./providers/types");
const registry_1 = require("./providers/registry");
let cachedChain = null;
let chainLogged = false;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function getChain() {
    if (!cachedChain) {
        cachedChain = (0, registry_1.getConfiguredProviderChain)();
        if (!chainLogged) {
            if (cachedChain.length === 0) {
                console.warn("⚠️  Sin proveedores LLM configurados. Configura DEEPSEEK_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY, o levanta Ollama.");
            }
            else {
                console.log(`🔗 Cadena LLM activa: ${(0, registry_1.describeChain)(cachedChain)}`);
            }
            chainLogged = true;
        }
    }
    return cachedChain;
}
function backoffMs(attempt) {
    const base = Number(process.env.OPENAI_BASE_RETRY_WAIT_MS || 3000);
    const max = Number(process.env.OPENAI_MAX_RETRY_WAIT_MS || 120000);
    return Math.min(base * Math.pow(2, Math.max(0, attempt - 1)), max);
}
function getGenerateConfig() {
    return {
        maxRetriesPerProvider: Number(process.env.OPENAI_MAX_RETRIES || 2),
        maxTotalRateLimitWaitMs: Number(process.env.OPENAI_MAX_RETRY_WAIT_MS || 600000)
    };
}
function initializeAIClient() {
    // Mantenido por compatibilidad; la cadena se construye on-demand.
    getChain();
}
exports.initializeAIClient = initializeAIClient;
let generateCodeOverride = null;
function setGenerateCodeOverride(override) {
    generateCodeOverride = override;
}
exports.setGenerateCodeOverride = setGenerateCodeOverride;
async function generateCode(systemPrompt, userPrompt, _model) {
    if (generateCodeOverride) {
        return generateCodeOverride(systemPrompt, userPrompt);
    }
    const chain = getChain();
    if (chain.length === 0) {
        throw new Error("No hay proveedores LLM configurados. Añade DEEPSEEK_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY, o levanta Ollama.");
    }
    const config = getGenerateConfig();
    let lastError = null;
    let totalRateLimitWait = 0;
    const longRateLimitThresholdMs = Number(process.env.LLM_LONG_RATE_LIMIT_MS || 60_000);
    providerLoop: for (const provider of chain) {
        modelLoop: for (const model of provider.models) {
            for (let attempt = 1; attempt <= config.maxRetriesPerProvider; attempt++) {
                try {
                    console.log(`🧠 [${provider.name}] modelo '${model}' (intento ${attempt}/${config.maxRetriesPerProvider})...`);
                    const result = await provider.generate(model, { systemPrompt, userPrompt });
                    return result;
                }
                catch (error) {
                    lastError = error;
                    if (!(0, types_1.isRateLimitError)(error)) {
                        console.warn(`⚠️  [${provider.name}:${model}] error no recuperable: ${error?.message || "desconocido"}`);
                        continue modelLoop;
                    }
                    const rateLimited = error;
                    const isLastAttempt = attempt === config.maxRetriesPerProvider;
                    const suggestedWait = rateLimited.retryAfterMs ?? backoffMs(attempt);
                    // Política 1: rate-limit largo en cualquier modelo del proveedor → todo el proveedor
                    // probablemente está saturado; mejor saltar al siguiente proveedor.
                    if (suggestedWait > longRateLimitThresholdMs) {
                        console.warn(`⚠️  [${provider.name}:${model}] rate-limit de ${(suggestedWait / 1000).toFixed(1)}s (>${(longRateLimitThresholdMs / 1000).toFixed(0)}s). Se pasa a otro proveedor en la cadena.`);
                        continue providerLoop;
                    }
                    // Política 2: rate-limit corto → espera y reintenta en mismo modelo.
                    if (isLastAttempt) {
                        console.warn(`⚠️  [${provider.name}:${model}] rate-limit persistente tras ${attempt} intentos. Saltando modelo.`);
                        continue modelLoop;
                    }
                    if (totalRateLimitWait + suggestedWait > config.maxTotalRateLimitWaitMs) {
                        console.warn(`⚠️  Máximo acumulado de espera (${(config.maxTotalRateLimitWaitMs / 1000).toFixed(0)}s) alcanzado. Saltando modelo.`);
                        continue modelLoop;
                    }
                    console.warn(`⏳ [${provider.name}:${model}] rate-limit corto. Esperando ${(suggestedWait / 1000).toFixed(1)}s...`);
                    await sleep(suggestedWait);
                    totalRateLimitWait += suggestedWait;
                }
            }
        }
    }
    const detail = lastError?.message || "sin detalle";
    throw new Error(`Todos los proveedores LLM (${chain.map(p => p.name).join(", ")}) fallaron por cuota/error. Último detalle: ${detail}`);
}
exports.generateCode = generateCode;
