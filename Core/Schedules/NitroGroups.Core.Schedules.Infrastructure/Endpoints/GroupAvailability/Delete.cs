using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Delete;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.GroupAvailability;

public class Delete : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/groups/{groupId:long}/schedule/{id:long}", async (
            long groupId,
            long id,
            IMediator mediator) =>
        {
            var command = new DeleteGroupAvailabilityCommand(groupId, id);
            var result = await mediator.SendCommandAsync<DeleteGroupAvailabilityCommand, Result<DeleteResponse>>(command);
            return result.IsFailure ? Results.BadRequest(result.Error) : Results.Ok(result.Value);
        })
        .WithTags("GroupAvailability");
    }
}
