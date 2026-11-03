using NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums;

namespace NitroGroups.Shared.Domain.DomainEvents.Bookings
{
    /// <summary>La solicitud fue aceptada, rechazada o cancelada.</summary>
    public class EventRequestStatusChangedEvent : IDomainEvent
    {
        public Guid EventId { get; set; } = Guid.NewGuid();
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
        public string EventType => nameof(EventRequestStatusChangedEvent);

        public long EventRequestId { get; set; }
        public long GroupId { get; set; }
        public long ClientUserId { get; set; }
        public DateOnly EventDate { get; set; }
        public EventRequestStatus OldStatus { get; set; }
        public EventRequestStatus NewStatus { get; set; }
        public EventRequestParty ChangedBy { get; set; }
    }
}
