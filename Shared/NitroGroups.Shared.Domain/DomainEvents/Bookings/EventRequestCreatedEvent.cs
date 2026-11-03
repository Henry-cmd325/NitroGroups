namespace NitroGroups.Shared.Domain.DomainEvents.Bookings
{
    /// <summary>Un cliente envió una solicitud de evento a un grupo.</summary>
    public class EventRequestCreatedEvent : IDomainEvent
    {
        public Guid EventId { get; set; } = Guid.NewGuid();
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
        public string EventType => nameof(EventRequestCreatedEvent);

        public long EventRequestId { get; set; }
        public long GroupId { get; set; }
        public long ClientUserId { get; set; }
        public DateOnly EventDate { get; set; }

        /// <summary>Tipo de evento pedido ("Boda", "XV años"...). No confundir con <see cref="EventType"/>.</summary>
        public string EventKind { get; set; } = string.Empty;
    }
}
