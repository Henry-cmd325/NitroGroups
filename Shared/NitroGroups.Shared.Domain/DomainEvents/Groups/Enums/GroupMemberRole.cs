namespace NitroGroups.Shared.Domain.DomainEvents.Groups.Enums
{
    /// <summary>
    /// Rol de un usuario dentro de un grupo. Owner y Manager pueden administrar el grupo.
    /// Los valores se guardan como enteros: no reordenar.
    /// </summary>
    public enum GroupMemberRole
    {
        Owner = 0,
        Member = 1,
        Manager = 2
    }
}
