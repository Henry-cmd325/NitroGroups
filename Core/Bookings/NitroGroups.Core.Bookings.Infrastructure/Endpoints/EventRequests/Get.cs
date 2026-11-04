using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Bookings.Application;
using NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Get;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts.Bookings.Responses;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Bookings.Infrastructure.Endpoints.EventRequests;

/// <summary>Detalle con mensajes. 404 para quien no es parte de la solicitud.</summary>
public class Get : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/event-requests/{id:long}", async (long id, IMediator mediator, ICurrentUserService currentUser) =>
            {
                var result = await mediator.SendQueryAsync<GetEventRequestByIdQuery, BookingResult<EventRequestResponse>>(
                    new GetEventRequestByIdQuery(id, currentUser.GetUserId(), currentUser.IsAdmin()));
                return result.ToHttp(value => Results.Ok(value));
            })
            .RequireSyncedUser(allowAdmin: true)
            .WithTags(BookingEndpointExtensions.Tag);
    }
}
