"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRateLimitError = exports.RateLimitError = void 0;
class RateLimitError extends Error {
    isRateLimit = true;
    retryAfterMs;
    provider;
    model;
    constructor(provider, model, message, retryAfterMs) {
        super(message);
        this.name = "RateLimitError";
        this.provider = provider;
        this.model = model;
        this.retryAfterMs = retryAfterMs;
    }
}
exports.RateLimitError = RateLimitError;
function isRateLimitError(error) {
    return !!(error && error.isRateLimit);
}
exports.isRateLimitError = isRateLimitError;
