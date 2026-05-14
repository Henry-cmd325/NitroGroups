using NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Get;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Schedules;

public class GetGroupAvailabilityQueryHandlerIntegrationTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public GetGroupAvailabilityQueryHandlerIntegrationTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_RangoValido_DeberiaRetornarItems()
    {
        await using var context = _fixture.CreateContext();
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
        await context.SaveChangesAsync();

        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new GetGroupAvailabilityQueryHandler(unitOfWork);

        var result = await handler.Handle(new GetGroupAvailabilityQuery(1, "2025-01-01T00:00:00Z", "2025-01-31T00:00:00Z", null, "all"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Items.Count);
    }

    [Fact]
    public async Task Handle_RangoInvalido_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new GetGroupAvailabilityQueryHandler(unitOfWork);

        var result = await handler.Handle(new GetGroupAvailabilityQuery(1, "bad-date", "2025-01-31T00:00:00Z", null, null), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("start", result.Error);
    }

    [Fact]
    public async Task Handle_TypeFilterBlocks_DeberiaRetornarSoloNoDisponibles()
    {
        await using var context = _fixture.CreateContext();
        context.GroupAvailabilities.AddRange(
            new GroupAvailability { GroupId = 1, StartAt = new DateTimeOffset(2025,1,10,10,0,0,TimeSpan.Zero), EndAt = new DateTimeOffset(2025,1,10,12,0,0,TimeSpan.Zero), Available = true, Note = "Disp" },
            new GroupAvailability { GroupId = 1, StartAt = new DateTimeOffset(2025,1,11,10,0,0,TimeSpan.Zero), EndAt = new DateTimeOffset(2025,1,11,12,0,0,TimeSpan.Zero), Available = false, Note = "Block" });
        await context.SaveChangesAsync();

        var unitOfWork = _fixture.CreateSchedulesUnitOfWork(context);
        var handler = new GetGroupAvailabilityQueryHandler(unitOfWork);

        var result = await handler.Handle(new GetGroupAvailabilityQuery(1, "2025-01-01T00:00:00Z", "2025-01-31T00:00:00Z", null, "blocks"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!.Items);
        Assert.False(result.Value.Items[0].Available);
        Assert.Equal("block", result.Value.Items[0].Type);
    }
}
