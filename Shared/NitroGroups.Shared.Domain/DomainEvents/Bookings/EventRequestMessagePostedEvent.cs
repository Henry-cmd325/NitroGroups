using NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums;

namespace NitroGroups.Shared.Domain.DomainEvents.Bookings
{
    /// <summary>
    /// Una de las partes escribió un mensaje en la solicitud. El cuerpo del mensaje no
    /// viaja en el evento (queda solo en la base) para no copiar datos personales al outbox.
    /// </summary>
    public class EventRequestMessagePostedEvent : IDomainEvent
    {
        public Guid EventId { get; set; } = Guid.NewGuid();
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
        public string EventType => nameof(EventRequestMessagePostedEvent);

        public long EventRequestId { get; set; }
        public long GroupId { get; set; }
        public long ClientUserId { get; set; }
        public long SenderUserId { get; set; }
        public EventRequestParty SenderParty { get; set; }
    }
}
