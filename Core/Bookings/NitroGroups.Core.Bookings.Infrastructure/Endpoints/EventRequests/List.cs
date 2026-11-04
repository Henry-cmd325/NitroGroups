using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Bookings.Application.UseCases.EventRequests.List;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts.Bookings.Responses;
using NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.EndpointMapping.Filters;

namespace NitroGroups.Core.Bookings.Infrastructure.Endpoints.EventRequests;

public class List : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        // Solicitudes que envió el usuario actual.
        app.MapGet("api/event-requests/mine", async (IMediator mediator, ICurrentUserService currentUser) =>
            {
                var result = await mediator.SendQueryAsync<GetMyEventRequestsQuery, List<EventRequestResponse>>(
                    new GetMyEventRequestsQuery(currentUser.GetUserId()!.Value));
                return Results.Ok(result);
            })
            .RequireSyncedUser()
            .WithTags(BookingEndpointExtensions.Tag);

        // Bandeja del grupo: solo Owner/Manager (o admin).
        app.MapGet("api/groups/{groupId:long}/event-requests", async (long groupId, EventRequestStatus? status, IMediator mediator) =>
            {
                var result = await mediator.SendQueryAsync<GetGroupEventRequestsQuery, List<EventRequestResponse>>(
                    new GetGroupEventRequestsQuery(groupId, status));
                return Results.Ok(result);
            })
            .RequireGroupManager()
            .WithTags(BookingEndpointExtensions.Tag);
    }
}
