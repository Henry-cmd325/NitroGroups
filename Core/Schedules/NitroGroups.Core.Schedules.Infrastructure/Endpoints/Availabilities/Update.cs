using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Update;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.Availabilities;

public class Update : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/groups/{id}/availabilities/{availabilityId}", async (
            long id, 
            long availabilityId,
            [FromBody] UpdateAvailabilityRequest request,
            IMediator mediator) =>
        {
            var command = new UpdateAvailabilityCommand(
                GroupId: id,
                AvailabilityId: availabilityId,
                Start: request.Start,
                End: request.End,
                Available: request.Available,
                CustomPrice: request.CustomPrice,
                Note: request.Note
            );
            
            var result = await mediator.SendCommandAsync<UpdateAvailabilityCommand, Result<ScheduleEventDto>>(command);

            if (result.IsFailure)
            {
                return Results.BadRequest(result.Error);
            }

            return Results.Ok(result.Value);
        })
        .WithTags("Schedules");
    }
}

public class UpdateAvailabilityRequest
{
    public DateTimeOffset Start { get; set; }
    public DateTimeOffset End { get; set; }
    public bool? Available { get; set; }
    public decimal? CustomPrice { get; set; }
    public string? Note { get; set; }
}
