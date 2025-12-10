using Microsoft.EntityFrameworkCore;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.Abstractions;
using NitroGroups.Shared.Contracts;
using System.Linq.Expressions;

namespace NitroGroups.Shared.Infrastructure
{
    public class GenericRepository<TEntity, TKey>(NitroGroupsContext context) : IGenericRepository<TEntity, TKey> where TEntity : class
    {
        private readonly NitroGroupsContext _context = context;
        private readonly DbSet<TEntity> _dbSet = context.Set<TEntity>();
        public async Task CreateAsync(TEntity entity)
        {
            await _dbSet.AddAsync(entity);
        }

        public void Delete(TEntity entity)
        {
            _dbSet.Remove(entity);
        }

        public async Task<List<TEntity>> GetAllAsync()
        {
            return await _dbSet.ToListAsync();
        }

        public async Task<TEntity?> GetByIdAsync(TKey id)
        {
            return await _dbSet.FindAsync(id);
        }

        public async Task<PagedResult<TEntity>> GetPagedAsync(int page, int size)
        {
            return await _dbSet.GetPagedAsync(page, size);
        }

        public void Update(TEntity entity)
        {
            _dbSet.Update(entity);
        }

        public async Task<IEnumerable<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate)
        {
            return await _dbSet.Where(predicate).ToListAsync();
        }
    }
}
