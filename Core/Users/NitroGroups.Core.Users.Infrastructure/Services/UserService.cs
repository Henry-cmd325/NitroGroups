using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.Paging;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class UserService(NitroGroupsContext context, ILogger<UserService> logger) : IUserService
    {
        private readonly NitroGroupsContext _context = context;
        private readonly ILogger<UserService> _logger = logger;

        public async Task<List<User>> GetAllAsync()
        {
            _logger.LogInformation("Executing GetAllAsync()");
            var varResponse = await _context.Users.ToListAsync();
            _logger.LogInformation("GetAllAsync() executed successfully: {varResponse}", varResponse);
            return varResponse;
        }

        public async Task<User> GetByIdAsync(int id)
        {
            return await _context.Users.FirstAsync(u => u.Id == id);
        }

        public async Task<User> CreateAsync(User user)
        {
            _logger.LogInformation("Creating new user: {Email}", user.Email);
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            _logger.LogInformation("User created successfully with ID: {Id}", user.Id);
            return user;
        }

        public async Task<PagedResult<User>> GetPagedAsync(int page, int size)
        { 
            return await _context.Users.GetPagedAsync(page, size);
        }
    }
}
