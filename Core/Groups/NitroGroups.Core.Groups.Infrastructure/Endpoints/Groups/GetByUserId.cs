using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Groups.GetByUserId;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class GetByUserId : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/users/{userId:long}/groups", async (long userId, IMediator mediator) =>
            {
                var result = await mediator.SendQueryAsync<GetGroupByUserIdQuery, Result<GroupResponse?>>(new GetGroupByUserIdQuery(userId));

                if (result.IsSuccess && result.Value is not null)
                    return Ok(result.Value);
                else
                    return NotFound();
            })
            .WithTags("Groups");
        }
    }
}
