namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Get;

public sealed class ScheduleItemDto
{
    public long Id { get; set; }
    public long GroupId { get; set; }
    public string StartAt { get; set; } = string.Empty;
    public string EndAt { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public bool Available { get; set; }
    public decimal? CustomPrice { get; set; }
    public string Note { get; set; } = string.Empty;
    public string RRule { get; set; } = string.Empty;
    public string Timezone { get; set; } = string.Empty;
}
