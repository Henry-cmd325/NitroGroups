using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Create;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.Availabilities;

public class Create : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/groups/{id}/availabilities", async (
            long id, 
            [FromBody] CreateAvailabilityRequest request,
            IMediator mediator) =>
        {
            var command = new CreateAvailabilityCommand(
                GroupId: id,
                Start: request.Start,
                End: request.End,
                Available: request.Available,
                CustomPrice: request.CustomPrice,
                Note: request.Note
            );
            
            var result = await mediator.SendCommandAsync<CreateAvailabilityCommand, Result<ScheduleEventDto>>(command);

            if (result.IsFailure)
            {
                return Results.BadRequest(result.Error);
            }

            return Results.Ok(result.Value);
        })
        .WithTags("Schedules");
    }
}

public class CreateAvailabilityRequest
{
    public DateTimeOffset Start { get; set; }
    public DateTimeOffset End { get; set; }
    public bool Available { get; set; } = true;
    public decimal? CustomPrice { get; set; }
    public string? Note { get; set; }
}
