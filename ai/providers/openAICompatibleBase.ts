import OpenAI from "openai";
import { LLMProvider, ProviderGenerateOptions, RateLimitError } from "./types";

function parseDurationTokenToMs(token: string): number | null {
    const match = token.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
    if (!match) return null;
    const value = parseFloat(match[1]);
    const unit = match[2];
    if (unit === "ms") return Math.floor(value);
    if (unit === "s") return Math.floor(value * 1000);
    if (unit === "m") return Math.floor(value * 60_000);
    if (unit === "h") return Math.floor(value * 3_600_000);
    return null;
}

function parseRetryAfterFromMessage(message: string): number | null {
    let total = 0;
    let found = false;
    const durationMatches = (message || "").matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g);
    for (const match of durationMatches) {
        const ms = parseDurationTokenToMs(`${match[1]}${match[2]}`);
        if (ms !== null) {
            total += ms;
            found = true;
        }
    }
    return found ? total : null;
}

function extractRetryAfterMs(error: any): number | undefined {
    const header = Number(error?.headers?.["retry-after"] || error?.headers?.get?.("retry-after"));
    if (!Number.isNaN(header) && header > 0) return header * 1000;

    const fromMessage = parseRetryAfterFromMessage(
        error?.error?.message || error?.message || ""
    );
    return fromMessage ?? undefined;
}

function isRateLimitLike(error: any): boolean {
    const status = error?.status || error?.statusCode;
    const code = (error?.code || error?.error?.code || "").toString().toLowerCase();
    const message = (error?.message || error?.error?.message || "").toString().toLowerCase();
    return status === 429 || code.includes("rate_limit") || message.includes("rate limit") || message.includes("quota");
}

export interface OpenAICompatibleConfig {
    name: string;
    apiKey?: string;
    baseURL: string;
    models: string[];
    requireApiKey?: boolean;
    temperatureOverride?: number;
    timeoutMs?: number;
}

/**
 * Base para proveedores con API compatible OpenAI (Groq, Cerebras, Gemini OpenAI-compat, Ollama...).
 */
export class OpenAICompatibleProvider implements LLMProvider {
    readonly name: string;
    readonly models: string[];
    private client: OpenAI | null = null;
    private readonly config: OpenAICompatibleConfig;

    constructor(config: OpenAICompatibleConfig) {
        this.name = config.name;
        this.models = config.models;
        this.config = config;
    }

    isConfigured(): boolean {
        if (this.models.length === 0) return false;
        if (this.config.requireApiKey !== false) {
            return !!this.config.apiKey && this.config.apiKey !== "MISSING";
        }
        return true;
    }

    private getClient(): OpenAI {
        if (!this.client) {
            this.client = new OpenAI({
                apiKey: this.config.apiKey || "local",
                baseURL: this.config.baseURL,
                timeout: this.config.timeoutMs
            });
        }
        return this.client;
    }

    async generate(model: string, options: ProviderGenerateOptions): Promise<string> {
        try {
            const response = await this.getClient().chat.completions.create({
                model,
                messages: [
                    { role: "system", content: options.systemPrompt },
                    { role: "user", content: options.userPrompt }
                ],
                temperature: options.temperature ?? this.config.temperatureOverride ?? 0.1
            });
            return (response.choices[0]?.message?.content || "").trim();
        } catch (error: any) {
            if (isRateLimitLike(error)) {
                throw new RateLimitError(
                    this.name,
                    model,
                    error?.error?.message || error?.message || "rate limit",
                    extractRetryAfterMs(error)
                );
            }
            throw error;
        }
    }

    async ping(): Promise<boolean> {
        try {
            // Simple: si está configurado y tenemos URL, asumimos alcanzable.
            // La verdad llega en generate(). Ping fuerte usaría un HEAD a /v1/models.
            const url = new URL(this.config.baseURL);
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`${url.origin}${url.pathname.replace(/\/$/, "")}/models`, {
                method: "GET",
                signal: controller.signal,
                headers: this.config.apiKey && this.config.apiKey !== "local"
                    ? { Authorization: `Bearer ${this.config.apiKey}` }
                    : undefined
            });
            clearTimeout(timer);
            return res.status < 500;
        } catch {
            return false;
        }
    }
}
