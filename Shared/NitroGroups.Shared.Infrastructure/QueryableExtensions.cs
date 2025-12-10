using Microsoft.EntityFrameworkCore;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Shared.Infrastructure;

public static class QueryableExtensions
{
    public static async Task<PagedResult<T>> GetPagedAsync<T>(this IQueryable<T> source, int pageNumber, int pageSize)
    {
        var count = await source.CountAsync();
        var items = await source
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(); 

        return new PagedResult<T>(items, count, pageNumber, pageSize);
    }
}