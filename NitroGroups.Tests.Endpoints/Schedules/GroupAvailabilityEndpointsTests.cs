using System.Net;
using System.Net.Http.Json;
using Cortex.Mediator;
using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Create;
using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Delete;
using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Get;
using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Update;
using NitroGroups.Shared.Contracts;
using NSubstitute;
using NitroGroups.Tests.Endpoints.Infrastructure;

namespace NitroGroups.Tests.Endpoints.Schedules;

public class GroupAvailabilityEndpointsTests(NitroGroupsWebAppFactory factory) : IClassFixture<NitroGroupsWebAppFactory>
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly IMediator _mediator = factory.Mediator;

    // ---------------------------------------------------------------
    // GET api/groups/{groupId}/schedule
    // ---------------------------------------------------------------

    [Fact]
    public async Task GetAvailability_RangoValido_Returns200()
    {
        var data = new ListScheduleResponse();

        _mediator
            .SendQueryAsync<GetGroupAvailabilityQuery, Result<ListScheduleResponse>>(
                Arg.Any<GetGroupAvailabilityQuery>())
            .Returns(Result<ListScheduleResponse>.Success(data));

        var response = await _client.GetAsync(
            "api/groups/1/schedule?start=2025-01-01&end=2025-01-31");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAvailability_ConsultaFalla_Returns400()
    {
        _mediator
            .SendQueryAsync<GetGroupAvailabilityQuery, Result<ListScheduleResponse>>(
                Arg.Any<GetGroupAvailabilityQuery>())
            .Returns(Result<ListScheduleResponse>.Failure("Rango inválido."));

        var response = await _client.GetAsync(
            "api/groups/1/schedule?start=2025-12-31&end=2025-01-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // POST api/groups/{groupId}/schedule  (requiere Idempotency-Key)
    // ---------------------------------------------------------------

    [Fact]
    public async Task CreateBlock_ValidRequest_Returns200()
    {
        var body = new
        {
            title = "Disponible fin de semana",
            description = "Disponibilidad abierta",
            startAt = "2025-02-01T10:00:00",
            endAt = "2025-02-01T14:00:00"
        };
        var blockResponse = new CreateBlockResponse
        {
            Id = 1,
            GroupId = 1,
            Title = "Disponible fin de semana",
            StartAt = "2025-02-01T10:00:00",
            EndAt = "2025-02-01T14:00:00"
        };

        _mediator
            .SendCommandAsync<CreateGroupAvailabilityCommand, Result<CreateBlockResponse>>(
                Arg.Any<CreateGroupAvailabilityCommand>())
            .Returns(Result<CreateBlockResponse>.Success(blockResponse));

        using var request = new HttpRequestMessage(HttpMethod.Post, "api/groups/1/schedule")
        {
            Content = JsonContent.Create(body),
            Headers = { { "Idempotency-Key", Guid.NewGuid().ToString() } }
        };
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CreateBlock_SinIdempotencyKey_Returns400()
    {
        var body = new { startAt = "2025-02-01T10:00:00", endAt = "2025-02-01T14:00:00" };

        var response = await _client.PostAsJsonAsync("api/groups/1/schedule", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateBlock_ComandoFalla_Returns400()
    {
        _mediator
            .SendCommandAsync<CreateGroupAvailabilityCommand, Result<CreateBlockResponse>>(
                Arg.Any<CreateGroupAvailabilityCommand>())
            .Returns(Result<CreateBlockResponse>.Failure("Conflicto."));

        var body = new
        {
            title = "Conflicto",
            startAt = "2025-02-01T10:00:00",
            endAt = "2025-02-01T14:00:00"
        };
        using var request = new HttpRequestMessage(HttpMethod.Post, "api/groups/1/schedule")
        {
            Content = JsonContent.Create(body),
            Headers = { { "Idempotency-Key", Guid.NewGuid().ToString() } }
        };
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // PATCH api/groups/{groupId}/schedule/{id}
    // ---------------------------------------------------------------

    [Fact]
    public async Task UpdateBlock_ValidRequest_Returns200()
    {
        var body = new
        {
            title = "Editado",
            description = "nueva desc",
            startAt = "2025-02-02T10:00:00",
            endAt = "2025-02-02T14:00:00"
        };
        var updated = new UpdateScheduleItemResponse
        {
            Id = 10,
            GroupId = 1,
            Title = "Editado"
        };

        _mediator
            .SendCommandAsync<UpdateGroupAvailabilityCommand, Result<UpdateScheduleItemResponse>>(
                Arg.Any<UpdateGroupAvailabilityCommand>())
            .Returns(Result<UpdateScheduleItemResponse>.Success(updated));

        using var request = new HttpRequestMessage(HttpMethod.Patch, "api/groups/1/schedule/10")
        {
            Content = JsonContent.Create(body)
        };
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<UpdateScheduleItemResponse>();
        Assert.Equal("Editado", result!.Title);
    }

    [Fact]
    public async Task UpdateBlock_ComandoFalla_Returns400()
    {
        _mediator
            .SendCommandAsync<UpdateGroupAvailabilityCommand, Result<UpdateScheduleItemResponse>>(
                Arg.Any<UpdateGroupAvailabilityCommand>())
            .Returns(Result<UpdateScheduleItemResponse>.Failure("No encontrado."));

        var body = new { title = "X", startAt = "2025-01-01T00:00:00", endAt = "2025-01-02T00:00:00" };
        using var request = new HttpRequestMessage(HttpMethod.Patch, "api/groups/1/schedule/9999")
        {
            Content = JsonContent.Create(body)
        };
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // DELETE api/groups/{groupId}/schedule/{id}
    // ---------------------------------------------------------------

    [Fact]
    public async Task DeleteBlock_Existente_Returns200()
    {
        var deleteResponse = new DeleteResponse { Success = true };

        _mediator
            .SendCommandAsync<DeleteGroupAvailabilityCommand, Result<DeleteResponse>>(
                Arg.Any<DeleteGroupAvailabilityCommand>())
            .Returns(Result<DeleteResponse>.Success(deleteResponse));

        var response = await _client.DeleteAsync("api/groups/1/schedule/10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<DeleteResponse>();
        Assert.True(result!.Success);
    }

    [Fact]
    public async Task DeleteBlock_ComandoFalla_Returns400()
    {
        _mediator
            .SendCommandAsync<DeleteGroupAvailabilityCommand, Result<DeleteResponse>>(
                Arg.Any<DeleteGroupAvailabilityCommand>())
            .Returns(Result<DeleteResponse>.Failure("No encontrado."));

        var response = await _client.DeleteAsync("api/groups/1/schedule/9999");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
