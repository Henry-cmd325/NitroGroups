namespace NitroGroups.Shared.Domain.DomainEvents.Users
{
    public class MusicianWithGroupCreatedEvent(long userId, long groupId) : IDomainEvent
    {
        public Guid EventId { get; set; } = Guid.NewGuid();
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
        public string EventType => nameof(MusicianWithGroupCreatedEvent);

        public long UserId { get; set; } = userId;
        public long GroupId { get; set; } = groupId;
    }
}