using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Remove;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.BusySchedules;

public class Remove : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/groups/{id}/busy-schedules/{scheduleId}", async (
            long id, 
            long scheduleId,
            IMediator mediator) =>
        {
            var command = new RemoveBusyScheduleCommand(GroupId: id, BusyScheduleId: scheduleId);
            
            var result = await mediator.SendCommandAsync<RemoveBusyScheduleCommand, Result<bool>>(command);

            if (result.IsFailure)
            {
                return Results.BadRequest(result.Error);
            }

            return Results.NoContent();
        })
        .WithTags("Schedules");
    }
}
