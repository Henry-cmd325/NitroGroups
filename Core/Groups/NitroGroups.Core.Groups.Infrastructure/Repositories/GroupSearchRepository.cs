using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Core.Groups.Infrastructure.Persistence;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;

namespace NitroGroups.Core.Groups.Infrastructure.Repositories
{
    internal sealed class GroupSearchRepository(GroupsDbContext context) : IGroupSearchRepository
    {
        public async Task<IReadOnlyList<long>> GetMatchingIdsAsync(GroupSearchFilter filter, CancellationToken cancellationToken = default)
            => await Apply(filter).Select(g => g.Id).ToListAsync(cancellationToken);

        public async Task<PagedResult<GroupSearchItem>> SearchAsync(
            GroupSearchFilter filter,
            IReadOnlySet<long> excludedIds,
            int page,
            int size,
            CancellationToken cancellationToken = default)
        {
            var query = Apply(filter);
            if (excludedIds.Count > 0)
            {
                var excluded = excludedIds.ToList();
                query = query.Where(g => !excluded.Contains(g.Id));
            }

            var total = await query.CountAsync(cancellationToken);

            // El offset se calcula en long: una página enorme da una página vacía, no un overflow.
            var skip = (long)(page - 1) * size;
            if (skip >= total)
                return new PagedResult<GroupSearchItem>([], total, page, size);

            var rows = await query
                .OrderByDescending(g => g.IsFeatured)
                .ThenByDescending(g => g.AverageRating)
                .ThenByDescending(g => g.TotalReviews)
                .ThenBy(g => g.GroupName)
                .ThenBy(g => g.Id) // desempate estable entre páginas
                .Skip((int)skip)
                .Take(size)
                .Select(g => new
                {
                    g.Id, g.Slug, g.GroupName, g.Description, g.LocationText, g.Currency,
                    g.BasePrice, g.HourlyRate, g.MinimumDurationHours, g.NumMembers,
                    g.CoverImageUrl, g.ProfilePictureUrl, g.AverageRating, g.TotalReviews, g.IsVerified,
                    FirstPhoto = g.Media
                        .Where(m => m.Type == MediaType.Photo)
                        .OrderByDescending(m => m.IsPrimary)
                        .ThenBy(m => m.DisplayOrder)
                        .Select(m => m.Url)
                        .FirstOrDefault(),
                    Genres = g.Genres
                        .OrderByDescending(gg => gg.IsPrimary)
                        .Select(gg => gg.Genre.Name)
                        .ToList(),
                })
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var items = rows.Select(r => new GroupSearchItem
            {
                Id = r.Id,
                Slug = r.Slug,
                GroupName = r.GroupName,
                Description = r.Description,
                LocationText = r.LocationText,
                Currency = string.IsNullOrEmpty(r.Currency) ? "MXN" : r.Currency,
                BasePrice = r.BasePrice,
                HourlyRate = r.HourlyRate,
                MinimumDurationHours = r.MinimumDurationHours,
                NumMembers = r.NumMembers,
                ImageUrl = r.CoverImageUrl ?? r.ProfilePictureUrl ?? r.FirstPhoto,
                Genres = r.Genres,
                AverageRating = r.AverageRating,
                TotalReviews = r.TotalReviews,
                IsVerified = r.IsVerified,
            }).ToList();

            return new PagedResult<GroupSearchItem>(items, total, page, size);
        }

        private IQueryable<Group> Apply(GroupSearchFilter filter)
        {
            var query = context.Groups.AsNoTracking().Where(g => g.Active && g.IsAcceptingBookings);

            if (filter.Text is { } text)
            {
                query = query.Where(g =>
                    g.GroupName.ToLower().Contains(text)
                    || g.Description.ToLower().Contains(text)
                    || g.Genres.Any(gg => gg.Genre.Name.ToLower().Contains(text)));
            }

            if (filter.GenreSlug is { } genre)
                query = query.Where(g => g.Genres.Any(gg => gg.Genre.Slug == genre));

            if (filter.City is { } city)
                query = query.Where(g => g.LocationText.ToLower().Contains(city));

            if (filter.MaxPrice is { } max)
                query = query.Where(g => g.BasePrice != null && g.BasePrice <= max);

            return query;
        }
    }
}
