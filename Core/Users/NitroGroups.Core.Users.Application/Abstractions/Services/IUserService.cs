using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Paging;

namespace NitroGroups.Core.Users.Application.Abstractions.Services
{
    public interface IUserService
    {
        public Task<User> GetByIdAsync(int id);
        public Task<List<User>> GetAllAsync();
        public Task<PagedResult<User>> GetPagedAsync(int page, int size);
        public Task<User> CreateAsync(User user);
    }
}
