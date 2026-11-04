using NitroGroups.Shared.Domain;
using NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums;

namespace NitroGroups.Core.Bookings.Domain.Entities;

/// <summary>Mensaje que una de las partes escribe dentro de una solicitud.</summary>
public class EventRequestMessage : DomainModel
{
    public const int MaxBodyLength = 2000;

    public long EventRequestId { get; set; }
    public long SenderUserId { get; set; }
    public EventRequestParty SenderParty { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public EventRequest? EventRequest { get; set; }
}
