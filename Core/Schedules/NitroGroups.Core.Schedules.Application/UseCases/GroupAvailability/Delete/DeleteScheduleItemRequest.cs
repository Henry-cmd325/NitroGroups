namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Delete;

public sealed class DeleteScheduleItemRequest
{
    public long GroupId { get; set; }
    public long Id { get; set; }
}
