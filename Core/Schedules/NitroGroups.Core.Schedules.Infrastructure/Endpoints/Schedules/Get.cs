using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using NitroGroups.Core.Schedules.Application.UseCases.Schedules.Get;
using NitroGroups.Shared.Contracts.Schedules.Responses;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.Contracts;
using System.Security.Claims;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.Schedules;

public class Get : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/groups/{id}/schedules", async (
            long id, 
            [FromQuery] DateTimeOffset start, 
            [FromQuery] DateTimeOffset end, 
            IMediator mediator) =>
        {
            var query = new GetGroupSchedulesQuery(id, start, end);
            var result = await mediator.SendQueryAsync<GetGroupSchedulesQuery, Result<List<ScheduleEventDto>>>(query);

            if (result.IsFailure)
            {
                return Results.BadRequest(result.Error);
            }

            return Results.Ok(result.Value);
        })
        .WithTags("Schedules");
    }
}
