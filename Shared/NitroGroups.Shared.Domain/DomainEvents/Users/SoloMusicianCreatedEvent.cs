namespace NitroGroups.Shared.Domain.DomainEvents.Users
{
    public class SoloMusicianCreatedEvent(long idUser, string groupName) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();

        public DateTime OccurredAt { get; } = DateTime.UtcNow;

        public string EventType => nameof(SoloMusicianCreatedEvent);

        public long IdUser { get; } = idUser;
        public string Name { get; } = groupName;
    }
}