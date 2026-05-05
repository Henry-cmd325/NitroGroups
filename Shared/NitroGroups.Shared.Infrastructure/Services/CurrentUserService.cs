using Microsoft.AspNetCore.Http;
using NitroGroups.Shared.Abstractions.Services;
using System.Security.Claims;

namespace NitroGroups.Shared.Infrastructure.Services
{
    public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;

        public long? GetUserId()
        {
            var id = _httpContextAccessor.HttpContext?.User?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(id))
                return null;

            // Auth0 JWTs use string identifiers (e.g. "auth0|abc123"), not numeric IDs.
            // Return null if the claim value is not a valid number.
            return long.TryParse(id, out var userId) ? userId : null;
        }
    }
}
