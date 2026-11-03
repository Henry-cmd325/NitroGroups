namespace NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums
{
    /// <summary>
    /// Estado de una solicitud de evento. Se guarda como entero: no reordenar ni
    /// reutilizar valores (las filas existentes cambiarían de significado).
    /// </summary>
    public enum EventRequestStatus
    {
        Pending = 0,
        Accepted = 1,
        Declined = 2,
        Cancelled = 3
    }

    /// <summary>Quién realiza una acción sobre la solicitud.</summary>
    public enum EventRequestParty
    {
        Client = 0,
        Group = 1
    }
}
