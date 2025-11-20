using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.Paging;
using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class UserService(NitroGroupsContext context, ILogger<UserService> logger, IOutboxService outboxService) : IUserService
    {
        private readonly NitroGroupsContext _context = context;
        private readonly ILogger<UserService> _logger = logger;
        private readonly IOutboxService _outboxService = outboxService;

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
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("Creating new user: {Email}", user.Email);
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                
                // Disparar evento de dominio después de que se asigne el ID
                user.RaiseUserCreatedEvent();
                
                // Guardar eventos en Outbox dentro de la transacción
                await _outboxService.SaveEventsAsync(user.DomainEvents);
                
                // Confirmar transacción
                await transaction.CommitAsync();
                
                // Limpiar eventos después de éxito
                user.ClearDomainEvents();
                
                _logger.LogInformation("User created successfully with ID: {Id}", user.Id);
                return user;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to create user: {Email}", user.Email);
                throw;
            }
        }

        public async Task<PagedResult<User>> GetPagedAsync(int page, int size)
        { 
            return await _context.Users.GetPagedAsync(page, size);
        }
    }
}
