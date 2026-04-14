using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Remove;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.Availabilities;

public class Remove : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/groups/{id}/availabilities/{availabilityId}", async (
            long id, 
            long availabilityId,
            IMediator mediator) =>
        {
            var command = new RemoveAvailabilityCommand(GroupId: id, AvailabilityId: availabilityId);
            
            var result = await mediator.SendCommandAsync<RemoveAvailabilityCommand, Result<bool>>(command);

            if (result.IsFailure)
            {
                return Results.BadRequest(result.Error);
            }

            return Results.NoContent();
        })
        .WithTags("Schedules");
    }
}
