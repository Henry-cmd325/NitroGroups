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

            return Convert.ToInt64(id);
        }
    }
}
