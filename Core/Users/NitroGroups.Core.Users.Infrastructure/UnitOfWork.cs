using Cortex.Mediator;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Application.Abstractions.Integrations;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.Abstractions;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Infrastructure;
using NitroGroups.Shared.Infrastructure.Events;

namespace NitroGroups.Core.Users.Infrastructure
{
    public class UnitOfWork : IUnitOfWorkUser
    {
        private readonly NitroGroupsContext _context;
        public IGenericRepository<User, long> Users { get; }
        public IGenericRepository<Musician, long> Musicians { get; }
        public IGroupIntegrationService GroupIntegrationService { get; }

        public IOutboxService OutboxService { get; }

        public UnitOfWork(NitroGroupsContext context, ILogger<OutboxService> logger, IMediator mediator, IEventProvider eventProvider, IGroupIntegrationService groupIntegrationService)
        {
            _context = context;
            Users = new GenericRepository<User, long>(_context);
            Musicians = new GenericRepository<Musician, long>(_context);
            OutboxService = new OutboxService(context, logger, mediator, eventProvider);
            GroupIntegrationService = groupIntegrationService;
        }
        
        public async Task<int> CompleteAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public async ValueTask DisposeAsync()
        {
            await _context.DisposeAsync();
            GC.SuppressFinalize(this);
        }
    }
}
