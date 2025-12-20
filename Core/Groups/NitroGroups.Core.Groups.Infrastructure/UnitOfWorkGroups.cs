using Cortex.Mediator;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.Abstractions;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Infrastructure;
using NitroGroups.Shared.Infrastructure.Events;

namespace NitroGroups.Core.Groups.Infrastructure
{
    public class UnitOfWorkGroups : IUnitOfWorkGroups
    {
        private readonly NitroGroupsContext _context;
        public IOutboxService OutboxService { get; }

        public IGenericRepository<Group, long> Groups { get; }

        public IGenericRepository<GroupMember, long> GroupMembers { get; }

        public UnitOfWorkGroups(NitroGroupsContext context, ILogger<OutboxService> logger, IMediator mediator, IEventProvider eventProvider)
        {
            _context = context;
            Groups = new GenericRepository<Group, long>(context);
            GroupMembers = new GenericRepository<GroupMember, long>(context);
        }

        public Task<int> CompleteAsync()
        {
            throw new NotImplementedException();
        }

        public ValueTask DisposeAsync()
        {
            throw new NotImplementedException();
        }
    }
}
