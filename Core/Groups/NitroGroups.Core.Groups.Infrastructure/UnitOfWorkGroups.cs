using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Abstractions.Repository;
using NitroGroups.Shared.Infrastructure.Context;
using NitroGroups.Shared.Infrastructure.Repository;

namespace NitroGroups.Core.Groups.Infrastructure
{
    public class UnitOfWorkGroups(
        NitroGroupsContext context, 
        IOutboxService outboxService,
        IGenericRepository<Group, long> groups,
        IGenericRepository<GroupMember, long> groupMembers,
        IGenericRepository<MusicGenre, long> musicGenres,
        IGenericRepository<GroupGenre, long> groupGenres,
        IGenericRepository<GroupMedia, long> groupMedia,
        IGenericRepository<GroupSong, long> groupSongs) : UnitOfWork(context, outboxService), IUnitOfWorkGroups
    {
        public IGenericRepository<Group, long> Groups { get; } = groups;
        public IGenericRepository<GroupMember, long> GroupMembers { get; } = groupMembers;
        public IGenericRepository<MusicGenre, long> MusicGenres { get; } = musicGenres;
        public IGenericRepository<GroupGenre, long> GroupGenres { get; } = groupGenres;
        public IGenericRepository<GroupMedia, long> GroupMedia { get; } = groupMedia;
        public IGenericRepository<GroupSong, long> GroupSongs { get; } = groupSongs;
    }
}