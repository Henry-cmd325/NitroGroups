using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts.Modules;
using System.Security.Claims;

namespace NitroGroups.Core.Users.Infrastructure.Auth
{
    /// <summary>
    /// Enriquece el principal autenticado con:
    /// - <see cref="NitroClaimTypes.UserId"/>: id interno del usuario, resuelto a partir de <c>sub</c>
    ///   (cacheado 5 minutos; el "no existe" 30 s, invalidado por POST api/auth/sync).
    /// - <see cref="ClaimTypes.Role"/> a partir del claim de roles de Auth0 (configurable en
    ///   <c>Auth0:RolesClaim</c>), para poder usar <c>IsInRole("admin")</c>.
    /// </summary>
    public sealed class NitroClaimsTransformation(
        IUsersModuleApi usersModule,
        IMemoryCache cache,
        IConfiguration configuration) : IClaimsTransformation
    {
        public const string DefaultRolesClaim = "https://nitrogroups.com/roles";
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
        private static readonly TimeSpan MissingUserCacheDuration = TimeSpan.FromSeconds(30);

        public static string CacheKey(string auth0Id) => $"nitro:uid:{auth0Id}";

        public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
        {
            if (principal.Identity is not ClaimsIdentity { IsAuthenticated: true } identity)
                return principal;

            // TransformAsync puede ejecutarse más de una vez por petición.
            if (identity.HasClaim(c => c.Type == NitroClaimTypes.UserId))
                return principal;

            var rolesClaim = configuration["Auth0:RolesClaim"] ?? DefaultRolesClaim;
            foreach (var role in principal.FindAll(rolesClaim).Select(c => c.Value).ToList())
            {
                if (!principal.IsInRole(role))
                    identity.AddClaim(new Claim(identity.RoleClaimType, role));
            }

            var auth0Id = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? principal.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(auth0Id))
                return principal;

            var cacheKey = CacheKey(auth0Id);
            if (!cache.TryGetValue(cacheKey, out long? userId))
            {
                userId = await usersModule.GetUserIdByAuth0IdAsync(auth0Id);
                // El "no existe" se cachea poco (evita una consulta por petición de un usuario que
                // nunca sincroniza) y POST api/auth/sync lo invalida al crear el usuario.
                cache.Set(cacheKey, userId, userId is null ? MissingUserCacheDuration : CacheDuration);
            }

            if (userId is null)
                return principal;

            identity.AddClaim(new Claim(NitroClaimTypes.UserId, userId.Value.ToString()));

            return principal;
        }
    }
}
