using NitroGroups.Shared.Domain;

namespace NitroGroups.Core.Schedules.Domain.Entities;

public enum BusyScheduleSource
{
    Contract,
    Rehearsal,
    Maintenance,
    Personal,
    Travel
}

public class BusySchedule : AuditableModel
{
    public long GroupId { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public BusyScheduleSource Source { get; set; } = BusyScheduleSource.Contract;
    public long? ContractId { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
}
