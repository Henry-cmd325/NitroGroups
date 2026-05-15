using Cortex.Mediator.Queries;
using NitroGroups.Core.Groups.Application.Abstractions;

namespace NitroGroups.Core.Groups.Application.UseCases.Songs.GetByGroup;

public record GetGroupSongsQuery(long GroupId) : IQuery<IEnumerable<GroupSongDto>>;

public record GroupSongDto(
    long Id,
    long GroupId,
    string TrackId);

public class GetGroupSongsQueryHandler(IUnitOfWorkGroups unitOfWork) : IQueryHandler<GetGroupSongsQuery, IEnumerable<GroupSongDto>>
{
    public async Task<IEnumerable<GroupSongDto>> Handle(GetGroupSongsQuery query, CancellationToken cancellationToken)
    {
        var songs = await unitOfWork.GroupSongs.FindAsync(s => s.GroupId == query.GroupId);

        return songs.Select(s => new GroupSongDto(
            s.Id,
            s.GroupId,
            s.TrackId));
    }
}
