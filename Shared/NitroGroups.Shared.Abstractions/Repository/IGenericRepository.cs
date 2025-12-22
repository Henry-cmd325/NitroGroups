using NitroGroups.Shared.Contracts;
using System.Linq.Expressions;

namespace NitroGroups.Shared.Abstractions.Repository
{
    public interface IGenericRepository<TEntity, TKey>
    {
        public Task<TEntity?> GetByIdAsync(TKey id);
        public Task<IEnumerable<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate);
        public Task<List<TEntity>> GetAllAsync();
        public Task<PagedResult<TEntity>> GetPagedAsync(int page, int size);
        public Task CreateAsync(TEntity entity);
        public void Update(TEntity entity);
        public void Delete(TEntity entity);
    }
}