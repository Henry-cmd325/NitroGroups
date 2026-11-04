using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Schedules.Infrastructure.Persistence;
using NitroGroups.Shared.Contracts.Modules;

namespace NitroGroups.Core.Schedules.Infrastructure.Adapters;

/// <summary>Implementación in-process de la API pública del módulo Schedules.</summary>
internal sealed class SchedulesModuleApi(SchedulesDbContext context) : ISchedulesModuleApi
{
    public async Task<IReadOnlySet<long>> GetUnavailableGroupIdsAsync(
        IReadOnlyCollection<long> groupIds,
        DateTimeOffset from,
        DateTimeOffset to,
        CancellationToken cancellationToken = default)
    {
        if (groupIds.Count == 0)
            return new HashSet<long>();

        var ids = groupIds.ToList();
        from = from.ToUniversalTime();
        to = to.ToUniversalTime();

        var busy = await context.BusySchedules.AsNoTracking()
            .Where(b => ids.Contains(b.GroupId) && b.StartAt < to && b.EndAt > from)
            .Select(b => b.GroupId)
            .ToListAsync(cancellationToken);

        var blocked = await context.GroupAvailabilities.AsNoTracking()
            .Where(a => ids.Contains(a.GroupId) && !a.Available && a.StartAt < to && a.EndAt > from)
            .Select(a => a.GroupId)
            .ToListAsync(cancellationToken);

        return busy.Concat(blocked).ToHashSet();
    }
}
