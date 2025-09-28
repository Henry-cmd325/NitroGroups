using Microsoft.AspNetCore.Routing;

namespace NitroGroups.Shared.EndpointMapping
{
    public interface IEndpoint
    {
        void MapEndpoint(IEndpointRouteBuilder app);
    }
}
 