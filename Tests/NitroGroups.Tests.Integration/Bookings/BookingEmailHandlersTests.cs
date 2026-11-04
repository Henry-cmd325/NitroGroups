using NitroGroups.Core.Bookings.Application.EventHandlers;
using NitroGroups.Core.Bookings.Application.Events;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums;
using NSubstitute;
using static NitroGroups.Tests.Integration.Bookings.BookingsTestScenario;

namespace NitroGroups.Tests.Integration.Bookings;

public class BookingEmailHandlersTests
{
    private readonly BookingsTestScenario _scenario = new();
    private readonly IEmailSender _email = Substitute.For<IEmailSender>();
    private BookingEmailRecipients Recipients => new(_scenario.Groups, _scenario.Users);

    [Fact]
    public async Task Creada_AvisaATodosLosManagersDelGrupo_ConElAsuntoEsperado()
    {
        const long otherManager = 101;
        _scenario.Groups.GetManagerUserIdsAsync(GroupId, Arg.Any<CancellationToken>()).Returns([ManagerId, otherManager]);
        _scenario.AllUsers[otherManager] = new(otherManager, "segundo@vargas.mx", "Rosa", "Vargas", Shared.Domain.DomainEvents.Users.Enums.UserType.Musician, null);
        var handler = new EventRequestCreatedEmailHandler(Recipients, _email);

        await handler.Handle(new BookingEvents.EventRequestCreatedEvent
        {
            EventRequestId = 5, GroupId = GroupId, ClientUserId = ClientId, EventDate = new DateOnly(2026, 12, 12), EventKind = "Boda"
        }, CancellationToken.None);

        const string subject = "Nueva solicitud de evento: Boda el 12/12/2026";
        await _email.Received(1).SendAsync("manager@vargas.mx", subject, Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _email.Received(1).SendAsync("segundo@vargas.mx", subject, Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _email.DidNotReceive().SendAsync("ana@cliente.mx", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(EventRequestStatus.Accepted, EventRequestParty.Group, "ana@cliente.mx", "Los Vargas aceptó tu solicitud del 12/12/2026")]
    [InlineData(EventRequestStatus.Declined, EventRequestParty.Group, "ana@cliente.mx", "Los Vargas rechazó tu solicitud del 12/12/2026")]
    [InlineData(EventRequestStatus.Cancelled, EventRequestParty.Group, "ana@cliente.mx", "Los Vargas canceló el evento del 12/12/2026")]
    [InlineData(EventRequestStatus.Cancelled, EventRequestParty.Client, "manager@vargas.mx", "El cliente canceló la solicitud del 12/12/2026")]
    public async Task CambioDeEstado_AvisaALaOtraParte(EventRequestStatus status, EventRequestParty by, string to, string subject)
    {
        var handler = new EventRequestStatusChangedEmailHandler(Recipients, _email);

        await handler.Handle(new BookingEvents.EventRequestStatusChangedEvent
        {
            EventRequestId = 5, GroupId = GroupId, ClientUserId = ClientId, EventDate = new DateOnly(2026, 12, 12),
            OldStatus = EventRequestStatus.Pending, NewStatus = status, ChangedBy = by
        }, CancellationToken.None);

        await _email.Received(1).SendAsync(to, subject, Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _email.Received(1).SendAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(EventRequestParty.Client, "manager@vargas.mx")]
    [InlineData(EventRequestParty.Group, "ana@cliente.mx")]
    public async Task Mensaje_AvisaSoloALaParteQueNoLoEscribio(EventRequestParty sender, string to)
    {
        var handler = new EventRequestMessagePostedEmailHandler(Recipients, _email);

        await handler.Handle(new BookingEvents.EventRequestMessagePostedEvent
        {
            EventRequestId = 5, GroupId = GroupId, ClientUserId = ClientId,
            SenderUserId = sender == EventRequestParty.Client ? ClientId : ManagerId, SenderParty = sender
        }, CancellationToken.None);

        await _email.Received(1).SendAsync(to, Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _email.Received(1).SendAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }
}
