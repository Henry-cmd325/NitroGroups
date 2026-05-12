using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Infrastructure.Context;
using NitroGroups.Shared.Infrastructure.Repository;

namespace NitroGroups.Core.Schedules.Infrastructure.Repositories;

internal sealed class BusyScheduleRepository(NitroGroupsContext dbContext) : GenericRepository<BusySchedule, long>(dbContext), IBusyScheduleRepository
{
    public async Task<List<BusySchedule>> GetBusySchedulesByGroupIdAsync(long groupId, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken = default)
    {
        return await _context.BusySchedules
            .Where(x => x.GroupId == groupId && x.StartAt < end && x.EndAt > start)
            .OrderBy(x => x.StartAt)
            .ToListAsync(cancellationToken);
    }
}
