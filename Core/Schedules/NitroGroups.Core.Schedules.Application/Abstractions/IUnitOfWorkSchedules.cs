namespace NitroGroups.Core.Schedules.Application.Abstractions;

public interface IUnitOfWorkSchedules
{
    IGroupAvailabilityRepository AvailabilityRepository { get; }
    IBusyScheduleRepository BusyScheduleRepository { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
