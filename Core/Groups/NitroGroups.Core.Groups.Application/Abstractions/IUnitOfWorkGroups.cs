using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Abstractions;
using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Core.Groups.Application.Abstractions
{
    public interface IUnitOfWorkGroups : IAsyncDisposable
    {
        IOutboxService OutboxService { get; }
        IGenericRepository<Group, long> Groups { get; }
        IGenericRepository<GroupMember, long> GroupMembers { get; }
        Task<int> CompleteAsync();
    }
}
