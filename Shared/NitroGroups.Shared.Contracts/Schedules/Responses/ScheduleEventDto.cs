namespace NitroGroups.Shared.Contracts.Schedules.Responses;

public class ScheduleEventDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTimeOffset Start { get; set; }
    public DateTimeOffset End { get; set; }
    public string BackgroundColor { get; set; } = string.Empty;
    public string BorderColor { get; set; } = string.Empty;
    public string TextColor { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public long? OriginalEntityId { get; set; }
}
