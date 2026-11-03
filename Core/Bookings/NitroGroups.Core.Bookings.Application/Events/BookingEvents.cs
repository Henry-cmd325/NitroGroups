using Cortex.Mediator.Notifications;

namespace NitroGroups.Core.Bookings.Application.Events;

/// <summary>
/// Versiones INotification de los eventos de Bookings: el outbox deserializa a estos tipos
/// (ver <c>EventProvider</c>, que los busca por el nombre de la clase base).
/// </summary>
public class BookingEvents
{
    public class EventRequestCreatedEvent : Shared.Domain.DomainEvents.Bookings.EventRequestCreatedEvent, INotification { }

    public class EventRequestStatusChangedEvent : Shared.Domain.DomainEvents.Bookings.EventRequestStatusChangedEvent, INotification { }

    public class EventRequestMessagePostedEvent : Shared.Domain.DomainEvents.Bookings.EventRequestMessagePostedEvent, INotification { }
}
