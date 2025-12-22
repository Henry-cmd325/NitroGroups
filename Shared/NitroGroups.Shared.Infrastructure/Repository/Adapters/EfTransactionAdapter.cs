using Microsoft.EntityFrameworkCore.Storage;
using NitroGroups.Shared.Abstractions.Repository;

namespace NitroGroups.Shared.Infrastructure.Repository.Adapters
{
    public class EfTransactionAdapter(IDbContextTransaction transaction) : ITransaction
    {
        private readonly IDbContextTransaction _transaction = transaction;

        public async Task CommitAsync(CancellationToken ct = default)
            => await _transaction.CommitAsync(ct);

        public async Task RollbackAsync(CancellationToken ct = default)
            => await _transaction.RollbackAsync(ct);

        public void Dispose() => _transaction.Dispose();
    }
}
