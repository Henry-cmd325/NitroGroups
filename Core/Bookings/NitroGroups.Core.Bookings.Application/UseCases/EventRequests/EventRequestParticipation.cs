using NitroGroups.Core.Bookings.Domain.Entities;
using NitroGroups.Shared.Contracts.Modules;

namespace NitroGroups.Core.Bookings.Application.UseCases.EventRequests;

/// <summary>
/// Qué papel tiene el usuario en una solicitud. Cada handler que carga una solicitud por id
/// lo calcula a partir de la solicitud guardada (nunca de la ruta) para evitar IDOR.
/// </summary>
public readonly record struct EventRequestParticipation(bool IsClient, bool IsManager)
{
    public bool IsParticipant => IsClient || IsManager;

    public static async Task<EventRequestParticipation> ResolveAsync(
        EventRequest request,
        long? userId,
        IGroupsModuleApi groups,
        CancellationToken cancellationToken)
    {
        if (userId is null)
            return default;

        var isClient = request.ClientUserId == userId.Value;
        var isManager = await groups.CanManageGroupAsync(request.GroupId, userId.Value, cancellationToken);
        return new EventRequestParticipation(isClient, isManager);
    }
}
