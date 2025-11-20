using Cortex.Mediator.Notifications;

namespace NitroGroups.Shared.Abstractions.Events
{
    public interface IDomainEvent : INotification
    {
        Guid EventId { get; }
        DateTime OccurredAt { get; }
        string EventType { get; }
    }
}
