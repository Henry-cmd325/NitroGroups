using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;

namespace NitroGroups.Core.Groups.Application.Abstractions
{
    public sealed record GroupSearchFilter(string? Text, string? GenreSlug, string? City, decimal? MaxPrice);

    /// <summary>Lectura optimizada para el buscador público.</summary>
    public interface IGroupSearchRepository
    {
        /// <summary>Ids de todos los grupos que cumplen el filtro (sin paginar).</summary>
        Task<IReadOnlyList<long>> GetMatchingIdsAsync(GroupSearchFilter filter, CancellationToken cancellationToken = default);

        Task<PagedResult<GroupSearchItem>> SearchAsync(
            GroupSearchFilter filter,
            IReadOnlySet<long> excludedIds,
            int page,
            int size,
            CancellationToken cancellationToken = default);
    }
}
