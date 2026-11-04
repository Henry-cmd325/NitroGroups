using Cortex.Mediator.Notifications;
using NitroGroups.Core.Bookings.Application.Events;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums;

namespace NitroGroups.Core.Bookings.Application.EventHandlers;

// Los handlers corren desde el outbox. Si un envío falla, la excepción hace que el outbox
// reintente el evento más tarde. Los emails no incluyen el texto de los mensajes: invitan a
// entrar a la plataforma para leerlos.

/// <summary>Nueva solicitud: avisa a los managers del grupo.</summary>
public sealed class EventRequestCreatedEmailHandler(BookingEmailRecipients recipients, IEmailSender email)
    : INotificationHandler<BookingEvents.EventRequestCreatedEvent>
{
    public async Task Handle(BookingEvents.EventRequestCreatedEvent notification, CancellationToken cancellationToken)
    {
        var to = await recipients.GroupManagersAsync(notification.GroupId, cancellationToken);
        var subject = $"Nueva solicitud de evento: {notification.EventKind} el {notification.EventDate:dd/MM/yyyy}";
        var body =
            $"Recibiste una solicitud de evento ({notification.EventKind}) para el {notification.EventDate:dd/MM/yyyy}.\n" +
            "Entra a NitroGroups para revisarla y responder.";

        foreach (var address in to)
            await email.SendAsync(address, subject, body, cancellationToken);
    }
}

/// <summary>Aceptada / rechazada / cancelada: avisa a la otra parte.</summary>
public sealed class EventRequestStatusChangedEmailHandler(BookingEmailRecipients recipients, IEmailSender email)
    : INotificationHandler<BookingEvents.EventRequestStatusChangedEvent>
{
    public async Task Handle(BookingEvents.EventRequestStatusChangedEvent notification, CancellationToken cancellationToken)
    {
        var groupName = await recipients.GroupNameAsync(notification.GroupId, cancellationToken);
        var date = notification.EventDate.ToString("dd/MM/yyyy");

        var (to, subject) = (notification.NewStatus, notification.ChangedBy) switch
        {
            (EventRequestStatus.Accepted, _) =>
                (await recipients.ClientAsync(notification.ClientUserId, cancellationToken), $"{groupName} aceptó tu solicitud del {date}"),
            (EventRequestStatus.Declined, _) =>
                (await recipients.ClientAsync(notification.ClientUserId, cancellationToken), $"{groupName} rechazó tu solicitud del {date}"),
            (EventRequestStatus.Cancelled, EventRequestParty.Group) =>
                (await recipients.ClientAsync(notification.ClientUserId, cancellationToken), $"{groupName} canceló el evento del {date}"),
            (EventRequestStatus.Cancelled, EventRequestParty.Client) =>
                (await recipients.GroupManagersAsync(notification.GroupId, cancellationToken), $"El cliente canceló la solicitud del {date}"),
            _ => ((IReadOnlyList<string>)[], string.Empty)
        };

        var body = $"{subject}.\nEntra a NitroGroups para ver el detalle.";
        foreach (var address in to)
            await email.SendAsync(address, subject, body, cancellationToken);
    }
}

/// <summary>Mensaje nuevo: avisa a la parte que no lo escribió.</summary>
public sealed class EventRequestMessagePostedEmailHandler(BookingEmailRecipients recipients, IEmailSender email)
    : INotificationHandler<BookingEvents.EventRequestMessagePostedEvent>
{
    public async Task Handle(BookingEvents.EventRequestMessagePostedEvent notification, CancellationToken cancellationToken)
    {
        IReadOnlyList<string> to;
        string subject;
        if (notification.SenderParty == EventRequestParty.Group)
        {
            var groupName = await recipients.GroupNameAsync(notification.GroupId, cancellationToken);
            to = await recipients.ClientAsync(notification.ClientUserId, cancellationToken);
            subject = $"Nuevo mensaje de {groupName} sobre tu solicitud";
        }
        else
        {
            to = await recipients.GroupManagersAsync(notification.GroupId, cancellationToken);
            subject = "Nuevo mensaje del cliente en una solicitud de evento";
        }

        var body = $"{subject}.\nEntra a NitroGroups para leerlo y responder.";
        foreach (var address in to)
            await email.SendAsync(address, subject, body, cancellationToken);
    }
}
