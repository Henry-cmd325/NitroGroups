using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Update;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.BusySchedules;

public class Update : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/groups/{id}/busy-schedules/{scheduleId}", async (
            long id, 
            long scheduleId,
            [FromBody] UpdateBusyScheduleRequest request,
            IMediator mediator) =>
        {
            var command = new UpdateBusyScheduleCommand(
                GroupId: id,
                BusyScheduleId: scheduleId,
                Start: request.Start,
                End: request.End,
                Title: request.Title,
                Source: request.Source
            );
            
            var result = await mediator.SendCommandAsync<UpdateBusyScheduleCommand, Result<ScheduleEventDto>>(command);

            if (result.IsFailure)
            {
                return Results.BadRequest(result.Error);
            }

            return Results.Ok(result.Value);
        })
        .WithTags("Schedules");
    }
}

public class UpdateBusyScheduleRequest
{
    public DateTimeOffset Start { get; set; }
    public DateTimeOffset End { get; set; }
    public string? Title { get; set; }
    public BusyScheduleSource? Source { get; set; }
}
