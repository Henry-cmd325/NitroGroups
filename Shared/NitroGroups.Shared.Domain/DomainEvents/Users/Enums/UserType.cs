namespace NitroGroups.Shared.Domain.DomainEvents.Users.Enums
{
    /// <summary>
    /// Tipo de cuenta. El rol dentro de un grupo (Owner/Manager/Member) es otro eje:
    /// ver <see cref="Groups.Enums.GroupMemberRole"/>. El administrador de la plataforma
    /// se define por el rol "admin" de Auth0, no por este enum.
    /// Los valores se guardan como enteros: no reordenar.
    /// </summary>
    public enum UserType
    {
        Client = 0,
        Musician = 1
    }
}
