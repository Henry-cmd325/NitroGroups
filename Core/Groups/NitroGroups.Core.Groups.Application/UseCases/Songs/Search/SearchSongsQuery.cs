using Cortex.Mediator.Queries;
using NitroGroups.Core.Groups.Application.Abstractions;

namespace NitroGroups.Core.Groups.Application.UseCases.Songs.Search;

public record SearchSongsQuery(string Query, int Limit = 20) : IQuery<IEnumerable<MusicTrackDto>>;

public class SearchSongsQueryHandler(
    IMusicService musicService,
    IUnitOfWorkGroups unitOfWork) : IQueryHandler<SearchSongsQuery, IEnumerable<MusicTrackDto>>
{
    public async Task<IEnumerable<MusicTrackDto>> Handle(SearchSongsQuery query, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query.Query))
            return [];

        return await musicService.SearchTracksAsync(query.Query, query.Limit);
    }
}
