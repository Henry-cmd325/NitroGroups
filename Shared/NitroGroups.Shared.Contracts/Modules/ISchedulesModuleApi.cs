namespace NitroGroups.Shared.Contracts.Modules
{
    /// <summary>API pública del módulo Schedules (disponibilidad de los grupos).</summary>
    public interface ISchedulesModuleApi
    {
        /// <summary>
        /// De los grupos dados, los que NO están disponibles en el rango: tienen un horario
        /// ocupado o un bloque marcado como no disponible que se cruza con él.
        /// </summary>
        Task<IReadOnlySet<long>> GetUnavailableGroupIdsAsync(
            IReadOnlyCollection<long> groupIds,
            DateTimeOffset from,
            DateTimeOffset to,
            CancellationToken cancellationToken = default);
    }
}
