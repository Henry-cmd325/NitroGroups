using NitroGroups.Shared.Contracts.Modules;

namespace NitroGroups.Core.Bookings.Application.EventHandlers;

/// <summary>Emails de las partes, resueltos por los contratos de Groups y Users.</summary>
public sealed class BookingEmailRecipients(IGroupsModuleApi groups, IUsersModuleApi users)
{
    /// <summary>Emails de los Owner/Manager activos del grupo (sin repetir ni vacíos).</summary>
    public async Task<IReadOnlyList<string>> GroupManagersAsync(long groupId, CancellationToken cancellationToken)
    {
        var managerIds = await groups.GetManagerUserIdsAsync(groupId, cancellationToken);
        if (managerIds.Count == 0)
            return [];

        var managers = await users.GetUsersAsync(managerIds, cancellationToken);
        return managers.Values
            .Select(u => u.Email?.Trim())
            .Where(e => !string.IsNullOrEmpty(e))
            .Select(e => e!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <summary>Email del cliente, o vacío si no hay.</summary>
    public async Task<IReadOnlyList<string>> ClientAsync(long clientUserId, CancellationToken cancellationToken)
    {
        var client = await users.GetUserAsync(clientUserId, cancellationToken);
        return string.IsNullOrWhiteSpace(client?.Email) ? [] : [client.Email.Trim()];
    }

    public async Task<string> GroupNameAsync(long groupId, CancellationToken cancellationToken)
        => (await groups.GetGroupAsync(groupId, cancellationToken))?.GroupName ?? "el grupo";
}
