using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Delete;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Schedules;

public class DeleteGroupAvailabilityCommandHandlerIntegrationTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public DeleteGroupAvailabilityCommandHandlerIntegrationTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_CuandoExiste_DeberiaEliminarYRetornarSuccess()
    {
        await using var context = _fixture.CreateContext();
        var entity = new GroupAvailability
        {
            GroupId = 55,
            StartAt = new DateTimeOffset(2025, 7, 1, 10, 0, 0, TimeSpan.Zero),
            EndAt = new DateTimeOffset(2025, 7, 1, 12, 0, 0, TimeSpan.Zero),
            Available = false,
            Note = "Eliminar"
        };
        context.GroupAvailabilities.Add(entity);
        await context.SaveChangesAsync();

        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new DeleteGroupAvailabilityCommandHandler(unitOfWork);

        var result = await handler.Handle(new DeleteGroupAvailabilityCommand(55, entity.Id), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.Success);
        Assert.Empty(context.GroupAvailabilities);
    }

    [Fact]
    public async Task Handle_CuandoNoExiste_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new DeleteGroupAvailabilityCommandHandler(unitOfWork);

        var result = await handler.Handle(new DeleteGroupAvailabilityCommand(55, 999), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("GroupAvailability no encontrado.", result.Error);
    }
}
