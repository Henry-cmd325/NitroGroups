import { LLMProvider } from "./providers/types";
import { isRateLimitError, RateLimitError } from "./providers/types";
import { getConfiguredProviderChain, describeChain } from "./providers/registry";

let cachedChain: LLMProvider[] | null = null;
let chainLogged = false;

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getChain(): LLMProvider[] {
    if (!cachedChain) {
        cachedChain = getConfiguredProviderChain();
        if (!chainLogged) {
            if (cachedChain.length === 0) {
                console.warn("⚠️  Sin proveedores LLM configurados. Configura GROQ_API_KEY o CEREBRAS_API_KEY o GEMINI_API_KEY, o levanta Ollama.");
            } else {
                console.log(`🔗 Cadena LLM activa: ${describeChain(cachedChain)}`);
            }
            chainLogged = true;
        }
    }
    return cachedChain;
}

function backoffMs(attempt: number): number {
    const base = Number(process.env.OPENAI_BASE_RETRY_WAIT_MS || 3000);
    const max = Number(process.env.OPENAI_MAX_RETRY_WAIT_MS || 120000);
    return Math.min(base * Math.pow(2, Math.max(0, attempt - 1)), max);
}

interface GenerateConfig {
    maxRetriesPerProvider: number;
    maxTotalRateLimitWaitMs: number;
}

function getGenerateConfig(): GenerateConfig {
    return {
        maxRetriesPerProvider: Number(process.env.OPENAI_MAX_RETRIES || 2),
        maxTotalRateLimitWaitMs: Number(process.env.OPENAI_MAX_RETRY_WAIT_MS || 600000)
    };
}

export function initializeAIClient() {
    // Mantenido por compatibilidad; la cadena se construye on-demand.
    getChain();
}

export async function generateCode(
    systemPrompt: string,
    userPrompt: string,
    _model?: string
): Promise<string> {
    const chain = getChain();
    if (chain.length === 0) {
        throw new Error("No hay proveedores LLM configurados. Añade GROQ_API_KEY / CEREBRAS_API_KEY / GEMINI_API_KEY o levanta Ollama.");
    }

    const config = getGenerateConfig();
    let lastError: unknown = null;
    let totalRateLimitWait = 0;

    const longRateLimitThresholdMs = Number(process.env.LLM_LONG_RATE_LIMIT_MS || 60_000);

    providerLoop:
    for (const provider of chain) {
        modelLoop:
        for (const model of provider.models) {
            for (let attempt = 1; attempt <= config.maxRetriesPerProvider; attempt++) {
                try {
                    console.log(`🧠 [${provider.name}] modelo '${model}' (intento ${attempt}/${config.maxRetriesPerProvider})...`);
                    const result = await provider.generate(model, { systemPrompt, userPrompt });
                    return result;
                } catch (error) {
                    lastError = error;

                    if (!isRateLimitError(error)) {
                        console.warn(`⚠️  [${provider.name}:${model}] error no recuperable: ${(error as any)?.message || "desconocido"}`);
                        continue modelLoop;
                    }

                    const rateLimited = error as RateLimitError;
                    const isLastAttempt = attempt === config.maxRetriesPerProvider;
                    const suggestedWait = rateLimited.retryAfterMs ?? backoffMs(attempt);

                    // Política 1: rate-limit largo en cualquier modelo del proveedor → todo el proveedor
                    // probablemente está saturado; mejor saltar al siguiente proveedor.
                    if (suggestedWait > longRateLimitThresholdMs) {
                        console.warn(`⚠️  [${provider.name}:${model}] rate-limit de ${(suggestedWait / 1000).toFixed(1)}s (>${(longRateLimitThresholdMs / 1000).toFixed(0)}s). Saltando al siguiente proveedor.`);
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

    const detail = (lastError as any)?.message || "sin detalle";
    throw new Error(
        `Todos los proveedores LLM (${chain.map(p => p.name).join(", ")}) fallaron por cuota/error. Último detalle: ${detail}`
    );
}
