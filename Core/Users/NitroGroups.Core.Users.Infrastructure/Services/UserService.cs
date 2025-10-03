using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class UserService(NitroGroupsContext context, ILogger<UserService> logger) : IUserService
    {
        private readonly NitroGroupsContext _context = context;
        private readonly ILogger<UserService> _logger = logger;

        public async Task<List<User>> GetAllAsync()
        {
            _logger.LogInformation("Executing GetAllAsync()");
            return await _context.Users.ToListAsync();
        }

        public async Task<User> GetByIdAsync(int id)
        {
            return await _context.Users.FirstAsync(u => u.Id == id);
        }
    }
}
