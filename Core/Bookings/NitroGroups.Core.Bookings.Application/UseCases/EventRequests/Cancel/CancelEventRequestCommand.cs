using Cortex.Mediator.Commands;
using NitroGroups.Core.Bookings.Application.Abstractions;
using NitroGroups.Core.Bookings.Domain.Entities;
using NitroGroups.Shared.Contracts.Bookings.Responses;
using NitroGroups.Shared.Contracts.Modules;
using NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums;

namespace NitroGroups.Core.Bookings.Application.UseCases.EventRequests.Cancel;

/// <summary>Cancela la solicitud: el cliente (pendiente o aceptada) o un manager (solo aceptada).</summary>
public sealed record CancelEventRequestCommand(long Id, long UserId) : ICommand<BookingResult<EventRequestResponse>>;

public sealed class CancelEventRequestCommandHandler(
    IUnitOfWorkBookings unitOfWork,
    IGroupsModuleApi groups,
    IUsersModuleApi users) : ICommandHandler<CancelEventRequestCommand, BookingResult<EventRequestResponse>>
{
    public async Task<BookingResult<EventRequestResponse>> Handle(CancelEventRequestCommand command, CancellationToken cancellationToken)
    {
        var request = await unitOfWork.EventRequests.GetWithMessagesAsync(command.Id, cancellationToken);
        if (request is null)
            return BookingResult<EventRequestResponse>.NotFound();

        var participation = await EventRequestParticipation.ResolveAsync(request, command.UserId, groups, cancellationToken);
        if (!participation.IsParticipant)
            return BookingResult<EventRequestResponse>.NotFound();

        // Si el usuario es el cliente, cancela como cliente (tiene más margen que el grupo).
        var party = participation.IsClient ? EventRequestParty.Client : EventRequestParty.Group;
        try
        {
            request.Cancel(party);
        }
        catch (InvalidEventRequestTransitionException ex)
        {
            return BookingResult<EventRequestResponse>.Failure(BookingErrorKind.Conflict, ex.Message);
        }

        await unitOfWork.OutboxService.SaveEventsAsync(request.DomainEvents);
        request.ClearDomainEvents();
        await unitOfWork.CompleteAsync();

        var response = await EventRequestResponses.BuildAsync(request, groups, users, includeMessages: true, cancellationToken);
        return BookingResult<EventRequestResponse>.Success(response);
    }
}
