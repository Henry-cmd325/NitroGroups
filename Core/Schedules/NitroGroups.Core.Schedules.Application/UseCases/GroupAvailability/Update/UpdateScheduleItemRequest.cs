namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Update;

public sealed class UpdateScheduleItemRequest
{
    public long GroupId { get; set; }
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StartAt { get; set; } = string.Empty;
    public string EndAt { get; set; } = string.Empty;
}
