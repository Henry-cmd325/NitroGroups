using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Shared.Abstractions.Repository
{
    public interface IUnitOfWork : IAsyncDisposable
    {
        IOutboxService OutboxService { get; }
        Task<int> CompleteAsync();
        Task<ITransaction> BeginTransactionAsync();
    }
}
