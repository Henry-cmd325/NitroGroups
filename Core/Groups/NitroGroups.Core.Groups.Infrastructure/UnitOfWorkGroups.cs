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
        IGenericRepository<GroupMember, long> groupMembers) : UnitOfWork(context, outboxService), IUnitOfWorkGroups
    {
        public IGenericRepository<Group, long> Groups { get; } = groups;

        public IGenericRepository<GroupMember, long> GroupMembers { get; } = groupMembers;
    }
}