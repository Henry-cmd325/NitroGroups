using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace NitroGroups.Shared.EndpointMapping.Filters
{
    public class IdempotencyFilter : IEndpointFilter
    {
        private const string IdempotencyHeader = "Idempotency-Key";

        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var httpContext = context.HttpContext;

            if (!httpContext.Request.Headers.TryGetValue(IdempotencyHeader, out var idempotencyKeyValues))
            {
                // No idempotency key provided, bypass filter
                return await next(context);
            }

            var idempotencyKey = idempotencyKeyValues.ToString();
            
            // Generate a cache key that is unique to the user, method, path, and the provided idempotency key
            var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            var cacheKey = $"Idempotency:{userId}:{httpContext.Request.Method}:{httpContext.Request.Path}:{idempotencyKey}";

            var cache = httpContext.RequestServices.GetRequiredService<IMemoryCache>();
            var logger = httpContext.RequestServices.GetRequiredService<ILogger<IdempotencyFilter>>();

            // Try to get cached response
            if (cache.TryGetValue(cacheKey, out object? cachedResponse))
            {
                logger.LogInformation("Idempotency hit! Returning cached response for key: {CacheKey}", cacheKey);
                return cachedResponse;
            }

            logger.LogDebug("Idempotency key not found in cache. Executing handler for key: {CacheKey}", cacheKey);

            // Execute the actual endpoint handler
            var result = await next(context);

            // Cache the result ONLY if it's a successful response (2xx)
            // Note: Since Minimal APIs often return an IResult (like Results.Ok(), Results.Created()), 
            // the result itself is cached. If it throws an exception, it won't be cached.
            if (result is IResult || result != null)
            {
                // Cache for 24 hours. The duration can be adjusted based on requirements.
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
                };

                cache.Set(cacheKey, result, cacheOptions);
                logger.LogInformation("Idempotency result cached for key: {CacheKey}", cacheKey);
            }

            return result;
        }
    }
}
