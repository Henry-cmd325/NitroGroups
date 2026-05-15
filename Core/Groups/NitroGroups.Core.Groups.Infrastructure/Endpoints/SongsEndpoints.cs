using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Songs.Add;
using NitroGroups.Core.Groups.Application.UseCases.Songs.GetByGroup;
using NitroGroups.Core.Groups.Application.UseCases.Songs.Remove;
using NitroGroups.Core.Groups.Application.UseCases.Songs.Search;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints;

public class SongsEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api")
            .WithTags("Songs");

        group.MapGet("/songs/search", async (
            [FromQuery] string q,
            [FromQuery] int? limit,
            IMediator mediator) =>
        {
            var result = await mediator.SendQueryAsync(new SearchSongsQuery(q, limit ?? 20));
            return Results.Ok(result);
        }).RequireAuthorization();

        group.MapGet("/groups/{id}/songs", async (
            long id,
            IMediator mediator) =>
        {
            var result = await mediator.SendQueryAsync(new GetGroupSongsQuery(id));
            return Results.Ok(result);
        }).RequireAuthorization();

        group.MapPost("/groups/{id}/songs", async (
            long id,
            [FromBody] AddSongRequest request,
            IMediator mediator) =>
        {
            var command = new AddSongToGroupCommand(id, request.TrackId);
            var result = await mediator.SendCommandAsync(command);
            return Results.Created($"/api/groups/{id}/songs/{result}", result);
        }).RequireAuthorization();

        group.MapDelete("/songs/{id}", async (
            long id,
            IMediator mediator) =>
        {
            var result = await mediator.SendCommandAsync(new RemoveSongFromGroupCommand(id));
            return result ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();
    }

    public record AddSongRequest(string TrackId);
}
