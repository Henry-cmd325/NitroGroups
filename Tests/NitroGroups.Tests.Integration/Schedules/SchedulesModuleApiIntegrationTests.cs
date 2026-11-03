using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Core.Schedules.Infrastructure.Adapters;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Schedules;

public class SchedulesModuleApiIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private static readonly DateTimeOffset Day = new(2026, 12, 12, 6, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task GruposConHorarioOcupadoOBloqueNoDisponible_SonNoDisponibles()
    {
        await using var context = fixture.CreateSchedulesContext();
        context.BusySchedules.Add(new BusySchedule { GroupId = 1, StartAt = Day.AddHours(14), EndAt = Day.AddHours(18) });
        context.GroupAvailabilities.Add(new GroupAvailability { GroupId = 2, StartAt = Day, EndAt = Day.AddDays(1), Available = false });
        context.GroupAvailabilities.Add(new GroupAvailability { GroupId = 3, StartAt = Day, EndAt = Day.AddDays(1), Available = true });
        context.BusySchedules.Add(new BusySchedule { GroupId = 4, StartAt = Day.AddDays(1), EndAt = Day.AddDays(1).AddHours(4) }); // otro día
        context.BusySchedules.Add(new BusySchedule { GroupId = 5, StartAt = Day, EndAt = Day.AddHours(2) });                   // no se consultó
        await context.SaveChangesAsync();

        var unavailable = await new SchedulesModuleApi(context).GetUnavailableGroupIdsAsync([1, 2, 3, 4], Day, Day.AddDays(1));

        Assert.Equal([1L, 2L], unavailable.Order());
    }
}
