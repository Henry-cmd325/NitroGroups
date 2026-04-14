using NitroGroups.Shared.Domain;

namespace NitroGroups.Core.Schedules.Domain.Entities;

public class GroupAvailability : AuditableModel
{
    public long GroupId { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public bool Available { get; set; } = true;
    public decimal? CustomPrice { get; set; }
    public string? Note { get; set; }
    public string? RRule { get; set; }
    public string Timezone { get; set; } = "UTC";
}
