using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints
{
    public class PruebaEndpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/prueba", () => "prueba exitosa").RequireAuthorization();
        }
    }
}
