using NitroGroups.Core.Schedules.Application.UseCases.Schedules.Get;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Schedules;

public class GetGroupSchedulesQueryHandlerIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture = fixture;

    [Fact]
    public async Task Handle_DeberiaRetornarDisponibilidadesYOcupadosDelRango()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new GetGroupSchedulesQueryHandler(unitOfWork);

        context.GroupAvailabilities.AddRange(
            new GroupAvailability
            {
                GroupId = 1,
                StartAt = new DateTimeOffset(2025, 1, 10, 10, 0, 0, TimeSpan.Zero),
                EndAt = new DateTimeOffset(2025, 1, 10, 12, 0, 0, TimeSpan.Zero),
                Available = true,
                Note = "Disponible"
            },
            new GroupAvailability
            {
                GroupId = 1,
                StartAt = new DateTimeOffset(2025, 1, 11, 10, 0, 0, TimeSpan.Zero),
                EndAt = new DateTimeOffset(2025, 1, 11, 12, 0, 0, TimeSpan.Zero),
                Available = false,
                Note = "Bloqueado"
            });

        context.BusySchedules.Add(new BusySchedule
        {
            GroupId = 1,
            Title = "Ensayo",
            Source = BusyScheduleSource.Rehearsal,
            StartAt = new DateTimeOffset(2025, 1, 12, 18, 0, 0, TimeSpan.Zero),
            EndAt = new DateTimeOffset(2025, 1, 12, 20, 0, 0, TimeSpan.Zero)
        });

        await context.SaveChangesAsync();

        var query = new GetGroupSchedulesQuery(
            GroupId: 1,
            Start: new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero),
            End: new DateTimeOffset(2025, 1, 31, 23, 59, 59, TimeSpan.Zero));

        var result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(3, result.Value!.Count);

        var availableEvent = result.Value.Single(x => x.Id.StartsWith("avail_") && x.IsAvailable);
        Assert.Equal("Disponible", availableEvent.Title);
        Assert.Equal("#34d399", availableEvent.BackgroundColor);

        var blockedEvent = result.Value.Single(x => x.Id.StartsWith("avail_") && !x.IsAvailable);
        Assert.Equal("Bloqueado", blockedEvent.Title);
        Assert.Equal("#e2e8f0", blockedEvent.BackgroundColor);

        var busyEvent = result.Value.Single(x => x.Id.StartsWith("busy_"));
        Assert.Equal("Ensayo", busyEvent.Title);
        Assert.False(busyEvent.IsAvailable);
        Assert.Equal("#fb7185", busyEvent.BackgroundColor);
    }

    [Fact]
    public async Task Handle_NoDebeRetornarEventosFueraDelRangoONiDeOtroGrupo()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new GetGroupSchedulesQueryHandler(unitOfWork);

        context.GroupAvailabilities.AddRange(
            new GroupAvailability
            {
                GroupId = 1,
                StartAt = new DateTimeOffset(2025, 2, 1, 10, 0, 0, TimeSpan.Zero),
                EndAt = new DateTimeOffset(2025, 2, 1, 12, 0, 0, TimeSpan.Zero),
                Available = true
            },
            new GroupAvailability
            {
                GroupId = 2,
                StartAt = new DateTimeOffset(2025, 1, 10, 10, 0, 0, TimeSpan.Zero),
                EndAt = new DateTimeOffset(2025, 1, 10, 12, 0, 0, TimeSpan.Zero),
                Available = true
            });
        await context.SaveChangesAsync();

        var query = new GetGroupSchedulesQuery(
            GroupId: 1,
            Start: new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero),
            End: new DateTimeOffset(2025, 1, 31, 23, 59, 59, TimeSpan.Zero));

        var result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!);
    }
}
