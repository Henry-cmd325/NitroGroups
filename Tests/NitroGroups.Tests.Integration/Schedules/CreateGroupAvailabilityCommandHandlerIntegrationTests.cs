using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Create;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Schedules;

public class CreateGroupAvailabilityCommandHandlerIntegrationTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public CreateGroupAvailabilityCommandHandlerIntegrationTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_DeberiaCrearBloqueYPersistirlo()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new CreateGroupAvailabilityCommandHandler(unitOfWork);

        var command = new CreateGroupAvailabilityCommand(
            GroupId: 45,
            IdempotencyKey: Guid.NewGuid(),
            Title: "Bloque manual",
            Description: "No disponible por evento",
            StartAt: "2025-06-01T10:00:00Z",
            EndAt: "2025-06-01T14:00:00Z");

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.True(result.Value!.Id > 0);
        Assert.Equal(45, result.Value.GroupId);
        Assert.Equal("Bloque manual", result.Value.Title);
        Assert.Equal("No disponible por evento", result.Value.Description);
        Assert.Equal("groupAvailability", result.Value.Source);

        var persisted = await context.GroupAvailabilities.FindAsync(result.Value.Id);
        Assert.NotNull(persisted);
        Assert.Equal(45, persisted!.GroupId);
        Assert.False(persisted.Available);
        Assert.Equal("Bloque manual", persisted.Note);
    }
}
