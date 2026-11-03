namespace NitroGroups.Shared.Abstractions.Repository
{
    /// <summary>
    /// Otro proceso modificó el mismo registro entre la lectura y el guardado (concurrencia
    /// optimista). La capa de aplicación la traduce a 409 sin conocer EF Core.
    /// </summary>
    public sealed class ConcurrencyConflictException(string message, Exception? inner = null) : Exception(message, inner);
}
