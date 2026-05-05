namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Get;

public sealed class ListScheduleRequest
{
    public long GroupId { get; set; }
    public string Start { get; set; } = string.Empty;
    public string End { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string TypeFilter { get; set; } = string.Empty;
}
