export interface ProviderGenerateOptions {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
}

export interface LLMProvider {
    /** Nombre legible, se usa en logs. */
    name: string;
    /** Modelos a intentar en orden dentro de este proveedor. */
    models: string[];
    /** Verifica que el proveedor esté configurado y alcanzable. */
    isConfigured(): boolean;
    /** Genera texto usando el modelo indicado. Lanza error con `isRateLimit=true` si aplica. */
    generate(model: string, options: ProviderGenerateOptions): Promise<string>;
    /** Opcional: latency check ligero (ping). */
    ping?(): Promise<boolean>;
}

export class RateLimitError extends Error {
    readonly isRateLimit = true;
    readonly retryAfterMs?: number;
    readonly provider: string;
    readonly model: string;

    constructor(provider: string, model: string, message: string, retryAfterMs?: number) {
        super(message);
        this.name = "RateLimitError";
        this.provider = provider;
        this.model = model;
        this.retryAfterMs = retryAfterMs;
    }
}

export function isRateLimitError(error: unknown): error is RateLimitError {
    return !!(error && (error as any).isRateLimit);
}
