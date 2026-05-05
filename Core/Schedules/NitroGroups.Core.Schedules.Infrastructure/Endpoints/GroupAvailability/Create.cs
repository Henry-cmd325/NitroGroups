using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Create;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure.Endpoints.GroupAvailability;

public class Create : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/groups/{groupId:long}/schedule", async (
            long groupId,
            [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
            [FromBody] CreateBlockBody body,
            IMediator mediator) =>
        {
            if (string.IsNullOrWhiteSpace(idempotencyKey) || !Guid.TryParse(idempotencyKey, out var idem))
            {
                return Results.BadRequest("Cabecera 'Idempotency-Key' requerida (GUID).");
            }

            if (string.IsNullOrWhiteSpace(body.StartAt) || string.IsNullOrWhiteSpace(body.EndAt))
            {
                return Results.BadRequest("El cuerpo debe incluir startAt y endAt.");
            }

            var command = new CreateGroupAvailabilityCommand(
                groupId,
                idem,
                body.Title ?? string.Empty,
                body.Description ?? string.Empty,
                body.StartAt,
                body.EndAt);
            var result = await mediator.SendCommandAsync<CreateGroupAvailabilityCommand, Result<CreateBlockResponse>>(command);
            return result.IsFailure ? Results.BadRequest(result.Error) : Results.Ok(result.Value);
        })
        .WithTags("GroupAvailability");
    }
}
