namespace NitroGroups.Shared.Abstractions.Repository
{
    public interface ITransaction
    {
        Task CommitAsync(CancellationToken cancellationToken = default);
        Task RollbackAsync(CancellationToken cancellationToken = default);
    }
}
