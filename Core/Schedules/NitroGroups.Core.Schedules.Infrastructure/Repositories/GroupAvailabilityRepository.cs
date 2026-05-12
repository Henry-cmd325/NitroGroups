using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Infrastructure.Context;
using NitroGroups.Shared.Infrastructure.Repository;

namespace NitroGroups.Core.Schedules.Infrastructure.Repositories;

internal sealed class GroupAvailabilityRepository(NitroGroupsContext dbContext) : GenericRepository<GroupAvailability, long>(dbContext), IGroupAvailabilityRepository
{
    public async Task<List<GroupAvailability>> GetAvailabilitiesByGroupIdAsync(long groupId, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken = default)
    {
        return await _context.GroupAvailabilities
            .Where(x => x.GroupId == groupId && x.StartAt < end && x.EndAt > start)
            .OrderBy(x => x.StartAt)
            .ToListAsync(cancellationToken);
    }
}
