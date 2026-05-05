using System.Text;
using AutoMapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups;

/// <summary>GET /api/groups/{groupId}/media — listado con cursor (B2B groupMedia).</summary>
public class ListMedia : IEndpoint
{
    private const int DefaultLimit = 24;
    private const int MaxLimit = 100;

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet(
                "api/groups/{groupId:long}/media",
                async (
                    long groupId,
                    string? after,
                    int? limit,
                    string? sort,
                    string? order,
                    IUnitOfWorkGroups unitOfWork,
                    IMapper mapper) =>
                {
                    var raw = await unitOfWork.GroupMedia.FindAsync(m => m.GroupId == groupId);
                    var list = raw.ToList();

                    var lim = limit is > 0 and <= MaxLimit ? limit.Value : DefaultLimit;
                    var sortKey = string.IsNullOrWhiteSpace(sort) ? "uploadedAt" : sort.Trim();
                    var desc = string.IsNullOrWhiteSpace(order)
                        ? !string.Equals(sortKey, "displayOrder", StringComparison.OrdinalIgnoreCase)
                        : string.Equals(order.Trim(), "desc", StringComparison.OrdinalIgnoreCase);

                    // Página solicitada vía cursor (después del último ítem de la tanda anterior).
                    if (!string.IsNullOrWhiteSpace(after))
                    {
                        list = ApplyAfterCursor(list, sortKey, desc, after.Trim());
                    }

                    list = ApplySort(list, sortKey, desc).ToList();

                    var hasMore = list.Count > lim;
                    var page = list.Take(lim).ToList();
                    string? nextCursor = null;
                    if (hasMore && page.Count > 0)
                    {
                        nextCursor = EncodeCursor(page[^1], sortKey);
                    }

                    var items = mapper.Map<List<GroupMediaResponse>>(page);
                    var response = new GroupMediaListResponse { Items = items, NextCursor = nextCursor };
                    return Ok(response);
                })
            .WithTags("Groups");
    }

    private static List<GroupMedia> ApplyAfterCursor(
        List<GroupMedia> list,
        string sortKey,
        bool desc,
        string after)
    {
        try
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(after));
            var parts = raw.Split('|', 3);
            if (parts.Length < 3) return list;

            if (parts[0] == "v2"
                && int.TryParse(parts[1], out var displayOrder)
                && long.TryParse(parts[2], out var idDo)
                && string.Equals(sortKey, "displayOrder", StringComparison.OrdinalIgnoreCase))
            {
                return desc
                    ? list
                        .Where(m =>
                            m.DisplayOrder < displayOrder
                            || (m.DisplayOrder == displayOrder && m.Id < idDo))
                        .ToList()
                    : list
                        .Where(m =>
                            m.DisplayOrder > displayOrder
                            || (m.DisplayOrder == displayOrder && m.Id > idDo))
                        .ToList();
            }

            if (parts[0] == "v1"
                && long.TryParse(parts[1], out var ticks)
                && long.TryParse(parts[2], out var id)
                && !string.Equals(sortKey, "displayOrder", StringComparison.OrdinalIgnoreCase))
            {
                var anchor = new DateTime(ticks, DateTimeKind.Utc);
                return desc
                    ? list
                        .Where(m =>
                            m.CreatedAt < anchor
                            || (m.CreatedAt == anchor && m.Id < id))
                        .ToList()
                    : list
                        .Where(m =>
                            m.CreatedAt > anchor
                            || (m.CreatedAt == anchor && m.Id > id))
                        .ToList();
            }
        }
        catch
        {
            // cursor inválido: no filtrar
        }

        return list;
    }

    private static IEnumerable<GroupMedia> ApplySort(
        List<GroupMedia> list,
        string sortKey,
        bool desc)
    {
        if (string.Equals(sortKey, "displayOrder", StringComparison.OrdinalIgnoreCase))
        {
            return desc
                ? list.OrderByDescending(m => m.DisplayOrder).ThenByDescending(m => m.Id)
                : list.OrderBy(m => m.DisplayOrder).ThenBy(m => m.Id);
        }

        // uploadedAt
        return desc
            ? list.OrderByDescending(m => m.CreatedAt).ThenByDescending(m => m.Id)
            : list.OrderBy(m => m.CreatedAt).ThenBy(m => m.Id);
    }

    private static string EncodeCursor(GroupMedia m, string sortKey)
    {
        if (string.Equals(sortKey, "displayOrder", StringComparison.OrdinalIgnoreCase))
        {
            var s = $"v2|{m.DisplayOrder}|{m.Id}";
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(s));
        }

        var line = $"v1|{m.CreatedAt.Ticks}|{m.Id}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(line));
    }
}
