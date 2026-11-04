using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Bookings.Application;
using NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Create;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts.Bookings.Requests;
using NitroGroups.Shared.Contracts.Bookings.Responses;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.EndpointMapping.Filters;

namespace NitroGroups.Core.Bookings.Infrastructure.Endpoints.EventRequests;

/// <summary>El cliente (usuario del token) envía una solicitud a un grupo.</summary>
public class Create : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/event-requests", async (CreateEventRequestBody body, IMediator mediator, ICurrentUserService currentUser) =>
            {
                var command = new CreateEventRequestCommand(
                    ClientUserId: currentUser.GetUserId()!.Value,
                    GroupId: body.GroupId,
                    EventDate: body.EventDate,
                    StartTime: body.StartTime,
                    DurationHours: body.DurationHours,
                    EventType: body.EventType,
                    LocationText: body.LocationText,
                    GuestCount: body.GuestCount,
                    Budget: body.Budget,
                    Message: body.Message);

                var result = await mediator.SendCommandAsync<CreateEventRequestCommand, BookingResult<EventRequestResponse>>(command);
                return result.ToHttp(value => Results.Created($"api/event-requests/{value.Id}", value));
            })
            .RequireSyncedUser()
            .AddEndpointFilter<ValidationFilter<CreateEventRequestBody>>()
            .WithTags(BookingEndpointExtensions.Tag);
    }
}
