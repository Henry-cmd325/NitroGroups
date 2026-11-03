namespace NitroGroups.Core.Bookings.Domain.Entities;

/// <summary>Se intentó un cambio de estado que la solicitud no permite (p. ej. aceptar una cancelada).</summary>
public sealed class InvalidEventRequestTransitionException(string message) : InvalidOperationException(message);
