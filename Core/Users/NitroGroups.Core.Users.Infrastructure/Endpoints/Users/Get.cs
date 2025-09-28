using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using static Microsoft.AspNetCore.Http.Results;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Application.Dtos;
using NitroGroups.Core.Users.Application.UseCases.Users.GetAll;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Users
{
    public class Get : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/users", async (IMediator mediator) => {
                return Ok(await mediator.SendQueryAsync<GetAllUsersQuery, List<UserDto>>(new()));
            });
        }
    }
}
