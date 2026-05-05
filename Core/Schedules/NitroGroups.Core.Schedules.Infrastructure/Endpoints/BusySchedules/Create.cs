using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Create;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.BusySchedules;

public class Create : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/groups/{id}/busy-schedules", async (
            long id, 
            [FromBody] CreateBusyScheduleRequest request,
            IMediator mediator) =>
        {
            var command = new CreateBusyScheduleCommand(
                GroupId: id,
                Title: request.Title,
                Start: request.Start,
                End: request.End,
                Source: request.Source ?? BusyScheduleSource.Personal
            );
            
            var result = await mediator.SendCommandAsync<CreateBusyScheduleCommand, Result<ScheduleEventDto>>(command);

            if (result.IsFailure)
            {
                return Results.BadRequest(result.Error);
            }

            return Results.Ok(result.Value);
        })
        .WithTags("Schedules");
    }
}

public class CreateBusyScheduleRequest
{
    public string Title { get; set; } = string.Empty;
    public DateTimeOffset Start { get; set; }
    public DateTimeOffset End { get; set; }
    public BusyScheduleSource? Source { get; set; }
}
