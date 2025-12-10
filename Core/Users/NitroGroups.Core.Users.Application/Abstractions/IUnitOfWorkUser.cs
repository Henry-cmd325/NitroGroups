using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Abstractions;

namespace NitroGroups.Core.Users.Application.Abstractions
{
    public interface IUnitOfWorkUser : IAsyncDisposable
    {
        IGenericRepository<User, int> Users { get; }
        Task<int> CompleteAsync();
    }
}
