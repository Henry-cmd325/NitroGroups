namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Create;

public sealed class CreateBlockRequest
{
    public long GroupId { get; set; }
    public Guid IdempotencyKey { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StartAt { get; set; } = string.Empty;
    public string EndAt { get; set; } = string.Empty;
}
