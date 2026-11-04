using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Infrastructure.Persistence;

namespace NitroGroups.Core.Schedules.Infrastructure.Repositories;

public class UnitOfWorkSchedules(
    SchedulesDbContext context,
    IGroupAvailabilityRepository availabilityRepository,
    IBusyScheduleRepository busyScheduleRepository) : IUnitOfWorkSchedules
{
    private readonly SchedulesDbContext _context = context;
    public IGroupAvailabilityRepository AvailabilityRepository { get; } = availabilityRepository;
    public IBusyScheduleRepository BusyScheduleRepository { get; } = busyScheduleRepository;

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
