using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Abstractions.Repository;

namespace NitroGroups.Core.Schedules.Application.Abstractions;

public interface IGroupAvailabilityRepository : IGenericRepository<GroupAvailability, long>
{
    Task<List<GroupAvailability>> GetAvailabilitiesByGroupIdAsync(long groupId, DateTimeOffset start, DateTimeOffset end, CancellationToken cancellationToken = default);
}
