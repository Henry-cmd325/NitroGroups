using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Update;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.GroupAvailability;

public class Update : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("api/groups/{groupId:long}/schedule/{id:long}", async (
            long groupId,
            long id,
            [FromBody] UpdateScheduleItemBody body,
            IMediator mediator) =>
        {
            var command = new UpdateGroupAvailabilityCommand(
                groupId,
                id,
                body.Title,
                body.Description,
                body.StartAt,
                body.EndAt);
            var result = await mediator.SendCommandAsync<UpdateGroupAvailabilityCommand, Result<UpdateScheduleItemResponse>>(command);
            return result.IsFailure ? Results.BadRequest(result.Error) : Results.Ok(result.Value);
        })
        .WithTags("GroupAvailability");
    }
}
