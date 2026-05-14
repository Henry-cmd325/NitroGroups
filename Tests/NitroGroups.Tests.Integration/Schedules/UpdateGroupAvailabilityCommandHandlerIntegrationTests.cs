using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Update;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Schedules;

public class UpdateGroupAvailabilityCommandHandlerIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture = fixture;

    [Fact]
    public async Task Handle_CuandoExisteYPerteneceAlGrupo_DeberiaActualizarYPersistir()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var entity = new GroupAvailability
        {
            GroupId = 10,
            StartAt = new DateTimeOffset(2025, 1, 10, 10, 0, 0, TimeSpan.Zero),
            EndAt = new DateTimeOffset(2025, 1, 10, 12, 0, 0, TimeSpan.Zero),
            Available = true,
            Note = "Inicial"
        };

        context.GroupAvailabilities.Add(entity);
        await context.SaveChangesAsync();

        var handler = new UpdateGroupAvailabilityCommandHandler(unitOfWork);
        var command = new UpdateGroupAvailabilityCommand(
            GroupId: 10,
            Id: entity.Id,
            Title: "Actualizado",
            Description: "Descripción nueva",
            StartAt: "2025-01-11T15:00:00Z",
            EndAt: "2025-01-11T18:00:00Z");

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(entity.Id, result.Value!.Id);
        Assert.Equal(10, result.Value.GroupId);
        Assert.Equal("Actualizado", result.Value.Title);
        Assert.Equal("Descripción nueva", result.Value.Description);
        Assert.Equal("groupAvailability", result.Value.Source);

        var persisted = await context.GroupAvailabilities.FindAsync(entity.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Actualizado", persisted!.Note);
        Assert.Equal(DateTimeOffset.Parse("2025-01-11T15:00:00Z"), persisted.StartAt);
        Assert.Equal(DateTimeOffset.Parse("2025-01-11T18:00:00Z"), persisted.EndAt);
    }

    [Fact]
    public async Task Handle_CuandoNoExiste_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new UpdateGroupAvailabilityCommandHandler(unitOfWork);

        var command = new UpdateGroupAvailabilityCommand(
            GroupId: 10,
            Id: 9999,
            Title: "Actualizado",
            Description: null,
            StartAt: null,
            EndAt: null);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("GroupAvailability no encontrado.", result.Error);
    }

    [Fact]
    public async Task Handle_CuandoPerteneceAOtroGrupo_DeberiaRetornarFailureYSinPersistirCambios()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var entity = new GroupAvailability
        {
            GroupId = 99,
            StartAt = new DateTimeOffset(2025, 1, 10, 10, 0, 0, TimeSpan.Zero),
            EndAt = new DateTimeOffset(2025, 1, 10, 12, 0, 0, TimeSpan.Zero),
            Available = true,
            Note = "Original"
        };

        context.GroupAvailabilities.Add(entity);
        await context.SaveChangesAsync();

        var handler = new UpdateGroupAvailabilityCommandHandler(unitOfWork);
        var command = new UpdateGroupAvailabilityCommand(
            GroupId: 10,
            Id: entity.Id,
            Title: "No debería aplicar",
            Description: null,
            StartAt: null,
            EndAt: null);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("El ítem no pertenece al grupo indicado.", result.Error);

        var persisted = await context.GroupAvailabilities.FindAsync(entity.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Original", persisted!.Note);
    }
}
