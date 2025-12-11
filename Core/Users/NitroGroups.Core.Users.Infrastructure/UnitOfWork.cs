using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.Abstractions;
using NitroGroups.Shared.Infrastructure;

namespace NitroGroups.Core.Users.Infrastructure
{
    public class UnitOfWork : IUnitOfWorkUser
    {
        private readonly NitroGroupsContext _context;
        public IGenericRepository<User, int> Users { get; }

        public IGenericRepository<Musician, int> Musicians { get; }

        public UnitOfWork(NitroGroupsContext context)
        {
            _context = context;
            Users = new GenericRepository<User, int>(_context);
            Musicians = new GenericRepository<Musician, int>(_context);
        }
        
        public async Task<int> CompleteAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public async ValueTask DisposeAsync()
        {
            await _context.DisposeAsync();
            GC.SuppressFinalize(this);
        }
    }
}
