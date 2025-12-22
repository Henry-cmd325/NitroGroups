using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Application.Abstractions.Integrations;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Abstractions.Repository;
using NitroGroups.Shared.Infrastructure.Repository;

namespace NitroGroups.Core.Users.Infrastructure
{
    public class UnitOfWorkUser(
        NitroGroupsContext context, 
        IOutboxService outboxService,
        IGenericRepository<User, long> users,
        IGenericRepository<Musician, long> musicians,
        IGroupIntegrationService groupIntegrationService) : UnitOfWork(context, outboxService), IUnitOfWorkUser
    {
        public IGenericRepository<User, long> Users { get; } = users;
        public IGenericRepository<Musician, long> Musicians { get; } = musicians;
        public IGroupIntegrationService GroupIntegrationService { get; } = groupIntegrationService;
    }
}
