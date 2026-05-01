namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Update;

public sealed class UpdateScheduleItemBody
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? StartAt { get; set; }
    public string? EndAt { get; set; }
}
