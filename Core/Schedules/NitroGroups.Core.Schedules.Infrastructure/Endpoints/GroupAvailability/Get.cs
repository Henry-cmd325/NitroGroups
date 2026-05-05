using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Get;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.GroupAvailability;

public class Get : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/groups/{groupId:long}/schedule", async (
            long groupId,
            [FromQuery] string start,
            [FromQuery] string end,
            [FromQuery] string? source,
            [FromQuery] string? typeFilter,
            IMediator mediator) =>
        {
            var query = new GetGroupAvailabilityQuery(groupId, start, end, source, typeFilter);
            var result = await mediator.SendQueryAsync<GetGroupAvailabilityQuery, Result<ListScheduleResponse>>(query);
            return result.IsFailure ? Results.BadRequest(result.Error) : Results.Ok(result.Value);
        })
        .WithTags("GroupAvailability");
    }
}
