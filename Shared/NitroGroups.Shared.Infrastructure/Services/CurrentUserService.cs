using Microsoft.AspNetCore.Http;
using NitroGroups.Shared.Abstractions.Services;
using System.Security.Claims;

namespace NitroGroups.Shared.Infrastructure.Services
{
    public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
    {
        private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

        public long? GetUserId()
        {
            var value = User?.FindFirst(NitroClaimTypes.UserId)?.Value;
            return long.TryParse(value, out var id) ? id : null;
        }

        public string? GetAuth0Id()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return null;

            // JwtBearer mapea "sub" a NameIdentifier por defecto; aceptamos ambos.
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        }

        /// <summary>
        /// Los access tokens de Auth0 no incluyen "email": hay que agregarlo con una Action como
        /// claim con namespace (<see cref="NitroClaimTypes.Auth0EmailClaim"/>). Ver README.
        /// </summary>
        public string? GetEmail() =>
            User?.FindFirst(NitroClaimTypes.Auth0EmailClaim)?.Value
            ?? User?.FindFirst(ClaimTypes.Email)?.Value
            ?? User?.FindFirst("email")?.Value;

        public bool IsAdmin() => User?.IsInRole(NitroClaimTypes.AdminRole) == true;
    }
}
