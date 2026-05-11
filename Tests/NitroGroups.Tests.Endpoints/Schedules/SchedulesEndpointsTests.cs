using System.Net;
using System.Net.Http.Json;
using Cortex.Mediator;
using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Create;
using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Remove;
using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Update;
using NitroGroups.Core.Schedules.Application.UseCases.Schedules.Get;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;
using NSubstitute;
using NitroGroups.Tests.Endpoints.Infrastructure;

namespace NitroGroups.Tests.Endpoints.Schedules;

public class SchedulesEndpointsTests(NitroGroupsWebAppFactory factory) : IClassFixture<NitroGroupsWebAppFactory>
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly IMediator _mediator = factory.Mediator;

    // ---------------------------------------------------------------
    // GET api/groups/{id}/schedules
    // ---------------------------------------------------------------

    [Fact]
    public async Task GetSchedules_RangoValido_Returns200()
    {
        var events = new List<ScheduleEventDto>
        {
            new() { Id = "1", Title = "Ensayo" }
        };

        _mediator
            .SendQueryAsync<GetGroupSchedulesQuery, Result<List<ScheduleEventDto>>>(
                Arg.Any<GetGroupSchedulesQuery>())
            .Returns(Result<List<ScheduleEventDto>>.Success(events));

        var start = Uri.EscapeDataString("2025-01-01T00:00:00+00:00");
        var end = Uri.EscapeDataString("2025-01-31T23:59:59+00:00");
        var response = await _client.GetAsync($"api/groups/1/schedules?start={start}&end={end}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<List<ScheduleEventDto>>();
        Assert.Single(result!);
    }

    [Fact]
    public async Task GetSchedules_ConsultaFalla_Returns400()
    {
        _mediator
            .SendQueryAsync<GetGroupSchedulesQuery, Result<List<ScheduleEventDto>>>(
                Arg.Any<GetGroupSchedulesQuery>())
            .Returns(Result<List<ScheduleEventDto>>.Failure("Rango inválido."));

        var start = Uri.EscapeDataString("2025-01-31T00:00:00+00:00");
        var end = Uri.EscapeDataString("2025-01-01T00:00:00+00:00");
        var response = await _client.GetAsync($"api/groups/1/schedules?start={start}&end={end}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // POST api/groups/{id}/busy-schedules
    // ---------------------------------------------------------------

    [Fact]
    public async Task CreateBusySchedule_ValidRequest_Returns200()
    {
        var body = new
        {
            title = "Evento privado",
            start = DateTimeOffset.UtcNow.AddDays(1),
            end = DateTimeOffset.UtcNow.AddDays(2),
            source = "Personal"
        };
        var created = new ScheduleEventDto { Id = "5", Title = "Evento privado" };

        _mediator
            .SendCommandAsync<CreateBusyScheduleCommand, Result<ScheduleEventDto>>(
                Arg.Any<CreateBusyScheduleCommand>())
            .Returns(Result<ScheduleEventDto>.Success(created));

        var response = await _client.PostAsJsonAsync("api/groups/1/busy-schedules", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ScheduleEventDto>();
        Assert.Equal(created.Title, result!.Title);
    }

    [Fact]
    public async Task CreateBusySchedule_ComandoFalla_Returns400()
    {
        _mediator
            .SendCommandAsync<CreateBusyScheduleCommand, Result<ScheduleEventDto>>(
                Arg.Any<CreateBusyScheduleCommand>())
            .Returns(Result<ScheduleEventDto>.Failure("Conflicto de horario."));

        var body = new
        {
            title = "Conflicto",
            start = DateTimeOffset.UtcNow,
            end = DateTimeOffset.UtcNow.AddHours(1)
        };
        var response = await _client.PostAsJsonAsync("api/groups/1/busy-schedules", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // PUT api/groups/{id}/busy-schedules/{scheduleId}
    // ---------------------------------------------------------------

    [Fact]
    public async Task UpdateBusySchedule_ValidRequest_Returns200()
    {
        var body = new
        {
            start = DateTimeOffset.UtcNow.AddDays(3),
            end = DateTimeOffset.UtcNow.AddDays(4),
            title = "Actualizado",
            source = BusyScheduleSource.Personal
        };
        var updated = new ScheduleEventDto { Id = "5", Title = "Actualizado" };

        _mediator
            .SendCommandAsync<UpdateBusyScheduleCommand, Result<ScheduleEventDto>>(
                Arg.Any<UpdateBusyScheduleCommand>())
            .Returns(Result<ScheduleEventDto>.Success(updated));

        var response = await _client.PutAsJsonAsync("api/groups/1/busy-schedules/5", body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ScheduleEventDto>();
        Assert.Equal("Actualizado", result!.Title);
    }

    [Fact]
    public async Task UpdateBusySchedule_ComandoFalla_Returns400()
    {
        _mediator
            .SendCommandAsync<UpdateBusyScheduleCommand, Result<ScheduleEventDto>>(
                Arg.Any<UpdateBusyScheduleCommand>())
            .Returns(Result<ScheduleEventDto>.Failure("No encontrado."));

        var body = new
        {
            start = DateTimeOffset.UtcNow,
            end = DateTimeOffset.UtcNow.AddHours(2),
            title = "X",
            source = BusyScheduleSource.Personal
        };
        var response = await _client.PutAsJsonAsync("api/groups/1/busy-schedules/99", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // DELETE api/groups/{id}/busy-schedules/{scheduleId}
    // ---------------------------------------------------------------

    [Fact]
    public async Task DeleteBusySchedule_Existente_Returns204()
    {
        _mediator
            .SendCommandAsync<RemoveBusyScheduleCommand, Result<bool>>(
                Arg.Any<RemoveBusyScheduleCommand>())
            .Returns(Result<bool>.Success(true));

        var response = await _client.DeleteAsync("api/groups/1/busy-schedules/5");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteBusySchedule_ComandoFalla_Returns400()
    {
        _mediator
            .SendCommandAsync<RemoveBusyScheduleCommand, Result<bool>>(
                Arg.Any<RemoveBusyScheduleCommand>())
            .Returns(Result<bool>.Failure("No encontrado."));

        var response = await _client.DeleteAsync("api/groups/1/busy-schedules/99");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
