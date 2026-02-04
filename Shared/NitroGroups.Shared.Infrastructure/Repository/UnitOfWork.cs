using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Abstractions.Repository;
using NitroGroups.Shared.Infrastructure.Context;
using NitroGroups.Shared.Infrastructure.Repository.Adapters;

namespace NitroGroups.Shared.Infrastructure.Repository
{
    public class UnitOfWork(NitroGroupsContext context, IOutboxService outboxService) : IUnitOfWork
    {
        private readonly NitroGroupsContext _context = context;
        public IOutboxService OutboxService { get; set; } = outboxService;

        public async Task<ITransaction> BeginTransactionAsync()
        {
            var transaction = await _context.Database.BeginTransactionAsync();
            return new EfTransactionAdapter(transaction);
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
