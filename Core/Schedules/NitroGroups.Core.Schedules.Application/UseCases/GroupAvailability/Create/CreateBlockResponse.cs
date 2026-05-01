namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Create;

public sealed class CreateBlockResponse
{
    public long Id { get; set; }
    public long GroupId { get; set; }
    public string StartAt { get; set; } = string.Empty;
    public string EndAt { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
}
