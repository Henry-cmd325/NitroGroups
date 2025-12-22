using NitroGroups.Core.Users.Application.Abstractions.Integrations;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Abstractions.Repository;

namespace NitroGroups.Core.Users.Application.Abstractions
{
    public interface IUnitOfWorkUser : IUnitOfWork
    {
        IGenericRepository<User, long> Users { get; }
        IGenericRepository<Musician, long> Musicians { get; }
        
        IGroupIntegrationService GroupIntegrationService { get; }
    }
}
