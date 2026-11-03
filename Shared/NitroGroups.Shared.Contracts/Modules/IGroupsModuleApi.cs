namespace NitroGroups.Shared.Contracts.Modules
{
    /// <summary>Datos públicos de un grupo que otros módulos pueden consultar.</summary>
    public sealed record GroupSummary(
        long Id,
        string Slug,
        string GroupName,
        string Email,
        long OwnerUserId,
        bool IsAcceptingBookings,
        string? ProfilePictureUrl,
        bool IsActive = true);

    /// <summary>
    /// API pública del módulo Groups. Es la única forma en que otros módulos
    /// leen datos de grupos o preguntan por permisos sobre un grupo.
    /// </summary>
    public interface IGroupsModuleApi
    {
        Task<bool> GroupExistsAsync(long groupId, CancellationToken cancellationToken = default);
        Task<GroupSummary?> GetGroupAsync(long groupId, CancellationToken cancellationToken = default);
        Task<IReadOnlyDictionary<long, GroupSummary>> GetGroupsAsync(IEnumerable<long> groupIds, CancellationToken cancellationToken = default);

        /// <summary>true si el usuario es Owner o Manager activo del grupo.</summary>
        Task<bool> CanManageGroupAsync(long groupId, long userId, CancellationToken cancellationToken = default);

        /// <summary>Ids de usuario de los Owner/Manager activos del grupo.</summary>
        Task<IReadOnlyList<long>> GetManagerUserIdsAsync(long groupId, CancellationToken cancellationToken = default);
    }
}
