using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Application.UseCases.Users.GetByAuth0Id;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Users
{
    public class GetByAuth0 : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/users/auth0/{auth0Id}", async (string auth0Id, IMediator mediator) =>
            {
                var result = await mediator.SendQueryAsync<GetByAuth0IdQuery, UserDto?>(new(auth0Id));
                return result != null ? Ok(result) : NotFound();
            })
            .RequireAuthorization()
            .WithTags("Users");
        }
    }
}
