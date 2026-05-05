using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Abstractions.Repository;

namespace NitroGroups.Core.Schedules.Application.Abstractions;

public interface IBusyScheduleRepository : IGenericRepository<BusySchedule, long>
{
    Task<List<BusySchedule>> GetBusySchedulesByGroupIdAsync(long groupId, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken = default);
}
