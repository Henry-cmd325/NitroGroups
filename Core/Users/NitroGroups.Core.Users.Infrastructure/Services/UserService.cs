using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class UserService(NitroGroupsContext context) : IUserService
    {
        private readonly NitroGroupsContext _context = context;

        public async Task<List<User>> GetAllAsync()
        {
            return await _context.Users.ToListAsync();
        }

        public async Task<User> GetByIdAsync(int id)
        {
            return await _context.Users.FirstAsync(u => u.Id == id);
        }
    }
}
