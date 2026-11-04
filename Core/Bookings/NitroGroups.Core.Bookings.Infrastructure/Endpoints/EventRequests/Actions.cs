using Cortex.Mediator;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Bookings.Application;
using NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Cancel;
using NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Messages;
using NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Respond;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts.Bookings.Requests;
using NitroGroups.Shared.Contracts.Bookings.Responses;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.EndpointMapping.Filters;

namespace NitroGroups.Core.Bookings.Infrastructure.Endpoints.EventRequests;

/// <summary>
/// Aceptar, rechazar, cancelar y escribir mensajes. El permiso lo decide cada handler
/// con el grupo y el cliente guardados en la solicitud (no con la ruta).
/// </summary>
public class Actions : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        MapRespond(app, "accept", EventRequestDecision.Accept);
        MapRespond(app, "decline", EventRequestDecision.Decline);

        app.MapPost("api/event-requests/{id:long}/cancel", async (long id, IMediator mediator, ICurrentUserService currentUser) =>
            {
                var result = await mediator.SendCommandAsync<CancelEventRequestCommand, BookingResult<EventRequestResponse>>(
                    new CancelEventRequestCommand(id, currentUser.GetUserId()!.Value));
                return result.ToHttp(value => Results.Ok(value));
            })
            .RequireSyncedUser()
            .WithTags(BookingEndpointExtensions.Tag);

        app.MapPost("api/event-requests/{id:long}/messages", async (long id, PostEventRequestMessageBody body, IMediator mediator, ICurrentUserService currentUser) =>
            {
                var result = await mediator.SendCommandAsync<PostEventRequestMessageCommand, BookingResult<EventRequestMessageResponse>>(
                    new PostEventRequestMessageCommand(id, currentUser.GetUserId()!.Value, body.Body));
                return result.ToHttp(value => Results.Created($"api/event-requests/{id}", value));
            })
            .RequireSyncedUser()
            .AddEndpointFilter<ValidationFilter<PostEventRequestMessageBody>>()
            .WithTags(BookingEndpointExtensions.Tag);
    }

    private static void MapRespond(IEndpointRouteBuilder app, string action, EventRequestDecision decision)
    {
        app.MapPost($"api/event-requests/{{id:long}}/{action}", async (
                long id,
                [FromBody] RespondEventRequestBody? body,
                IMediator mediator,
                ICurrentUserService currentUser,
                IValidator<RespondEventRequestBody> validator) =>
            {
                // El body es opcional, así que se valida aquí en vez de con ValidationFilter.
                body ??= new RespondEventRequestBody();
                var validation = await validator.ValidateAsync(body);
                if (!validation.IsValid)
                    return Results.ValidationProblem(validation.ToDictionary());

                var result = await mediator.SendCommandAsync<RespondToEventRequestCommand, BookingResult<EventRequestResponse>>(
                    new RespondToEventRequestCommand(id, currentUser.GetUserId()!.Value, decision, body.Message));
                return result.ToHttp(value => Results.Ok(value));
            })
            .RequireSyncedUser()
            .WithTags(BookingEndpointExtensions.Tag);
    }
}
