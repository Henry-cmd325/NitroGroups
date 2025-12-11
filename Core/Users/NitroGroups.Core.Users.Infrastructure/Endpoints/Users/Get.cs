using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Application.UseCases.Users.GetAll;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Users
{
    public class Get : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/users", async (IMediator mediator, int page = 1, int size = 10) => {
                var result = await mediator.SendQueryAsync<GetAllUsersQuery, PagedResult<UserDto>>(new() { Page = page, Size = size });
                return Ok(result);
            }).RequireAuthorization();
        }
    }
}
