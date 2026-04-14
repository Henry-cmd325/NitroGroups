using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Shared.Infrastructure.Context;

namespace NitroGroups.Core.Schedules.Infrastructure.Repositories;

public class UnitOfWorkSchedules(
    NitroGroupsContext context,
    IGroupAvailabilityRepository availabilityRepository,
    IBusyScheduleRepository busyScheduleRepository) : IUnitOfWorkSchedules
{
    private readonly NitroGroupsContext _context = context;
    public IGroupAvailabilityRepository AvailabilityRepository { get; } = availabilityRepository;
    public IBusyScheduleRepository BusyScheduleRepository { get; } = busyScheduleRepository;

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
