using NitroGroups.Core.Users.Application.Abstractions.Integrations;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Abstractions;
using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Core.Users.Application.Abstractions
{
    public interface IUnitOfWorkUser : IAsyncDisposable
    {
        IOutboxService OutboxService { get; }
        IGenericRepository<User, long> Users { get; }
        IGenericRepository<Musician, long> Musicians { get; }
        
        IGroupIntegrationService GroupIntegrationService { get; }
        Task<int> CompleteAsync();
    }
}
