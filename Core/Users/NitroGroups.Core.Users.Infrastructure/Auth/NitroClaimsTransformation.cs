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
    ///   (cacheado 5 minutos; si el usuario todavía no se sincronizó, no se agrega ni se cachea).
    /// - <see cref="ClaimTypes.Role"/> a partir del claim de roles de Auth0 (configurable en
    ///   <c>Auth0:RolesClaim</c>), para poder usar <c>IsInRole("admin")</c>.
    /// </summary>
    internal sealed class NitroClaimsTransformation(
        IUsersModuleApi usersModule,
        IMemoryCache cache,
        IConfiguration configuration) : IClaimsTransformation
    {
        public const string DefaultRolesClaim = "https://nitrogroups.com/roles";
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

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

            var cacheKey = $"nitro:uid:{auth0Id}";
            if (!cache.TryGetValue(cacheKey, out long userId))
            {
                var found = await usersModule.GetUserIdByAuth0IdAsync(auth0Id);
                if (found is null)
                    return principal; // Sin sincronizar: no se cachea, la próxima petición vuelve a consultar.

                userId = found.Value;
                cache.Set(cacheKey, userId, CacheDuration);
            }

            identity.AddClaim(new Claim(NitroClaimTypes.UserId, userId.ToString()));

            return principal;
        }
    }
}
