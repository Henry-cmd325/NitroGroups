using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Users.Application.Abstractions.Repositories
{
    public interface IUserRepository
    {
        public Task<User> GetByIdAsync(int id);
        public Task<List<User>> GetAllAsync();
        public Task<PagedResult<User>> GetPagedAsync(int page, int size);
        public Task<User> CreateAsync(User user);
    }
}
