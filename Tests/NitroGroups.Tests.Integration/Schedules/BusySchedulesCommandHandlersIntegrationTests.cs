using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Create;
using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Remove;
using NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Update;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Schedules;

public class BusySchedulesCommandHandlersIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture = fixture;

    [Fact]
    public async Task CreateBusySchedule_DeberiaPersistirYRetornarDto()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new CreateBusyScheduleCommandHandler(unitOfWork);

        var command = new CreateBusyScheduleCommand(
            GroupId: 50,
            Title: "Prueba de sonido",
            Start: new DateTimeOffset(2025, 2, 1, 18, 0, 0, TimeSpan.Zero),
            End: new DateTimeOffset(2025, 2, 1, 20, 0, 0, TimeSpan.Zero),
            Source: BusyScheduleSource.Rehearsal);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.StartsWith("busy_", result.Value!.Id);
        Assert.Equal("Prueba de sonido", result.Value.Title);
        Assert.False(result.Value.IsAvailable);

        var persisted = context.BusySchedules.Single();
        Assert.Equal(50, persisted.GroupId);
        Assert.Equal(BusyScheduleSource.Rehearsal, persisted.Source);
        Assert.Equal("Prueba de sonido", persisted.Title);
    }

    [Fact]
    public async Task UpdateBusySchedule_CuandoExisteYCorrespondeAlGrupo_DeberiaActualizar()
    {
        await using var context = _fixture.CreateContext();
        var entity = new BusySchedule
        {
            GroupId = 77,
            Title = "Viejo",
            Source = BusyScheduleSource.Personal,
            StartAt = new DateTimeOffset(2025, 3, 1, 10, 0, 0, TimeSpan.Zero),
            EndAt = new DateTimeOffset(2025, 3, 1, 12, 0, 0, TimeSpan.Zero)
        };
        context.BusySchedules.Add(entity);
        await context.SaveChangesAsync();

        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new UpdateBusyScheduleCommandHandler(unitOfWork);
        var command = new UpdateBusyScheduleCommand(
            GroupId: 77,
            BusyScheduleId: entity.Id,
            Start: new DateTimeOffset(2025, 3, 1, 15, 0, 0, TimeSpan.Zero),
            End: new DateTimeOffset(2025, 3, 1, 17, 0, 0, TimeSpan.Zero),
            Title: "Nuevo",
            Source: BusyScheduleSource.Travel);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Nuevo", result.Value!.Title);

        var persisted = await context.BusySchedules.FindAsync(entity.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Nuevo", persisted!.Title);
        Assert.Equal(BusyScheduleSource.Travel, persisted.Source);
    }

    [Fact]
    public async Task UpdateBusySchedule_CuandoNoExiste_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new UpdateBusyScheduleCommandHandler(unitOfWork);

        var result = await handler.Handle(
            new UpdateBusyScheduleCommand(
                GroupId: 1,
                BusyScheduleId: 999,
                Start: DateTimeOffset.UtcNow,
                End: DateTimeOffset.UtcNow.AddHours(1),
                Title: "X",
                Source: BusyScheduleSource.Personal),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("Busy Schedule not found or does not belong to the group.", result.Error);
    }

    [Fact]
    public async Task RemoveBusySchedule_CuandoExiste_DeberiaEliminarlo()
    {
        await using var context = _fixture.CreateContext();
        var entity = new BusySchedule
        {
            GroupId = 88,
            Title = "Eliminar",
            Source = BusyScheduleSource.Maintenance,
            StartAt = new DateTimeOffset(2025, 4, 1, 10, 0, 0, TimeSpan.Zero),
            EndAt = new DateTimeOffset(2025, 4, 1, 11, 0, 0, TimeSpan.Zero)
        };
        context.BusySchedules.Add(entity);
        await context.SaveChangesAsync();

        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new RemoveBusyScheduleCommandHandler(unitOfWork);

        var result = await handler.Handle(new RemoveBusyScheduleCommand(88, entity.Id), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value);
        Assert.Empty(context.BusySchedules);
    }

    [Fact]
    public async Task RemoveBusySchedule_CuandoNoPerteneceAlGrupo_DeberiaRetornarFailureYSinEliminar()
    {
        await using var context = _fixture.CreateContext();
        var entity = new BusySchedule
        {
            GroupId = 100,
            Title = "No eliminar",
            Source = BusyScheduleSource.Contract,
            StartAt = new DateTimeOffset(2025, 4, 2, 10, 0, 0, TimeSpan.Zero),
            EndAt = new DateTimeOffset(2025, 4, 2, 11, 0, 0, TimeSpan.Zero)
        };
        context.BusySchedules.Add(entity);
        await context.SaveChangesAsync();

        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new RemoveBusyScheduleCommandHandler(unitOfWork);

        var result = await handler.Handle(new RemoveBusyScheduleCommand(200, entity.Id), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("Busy Schedule not found or does not belong to the group.", result.Error);
        Assert.Single(context.BusySchedules);
    }
}
