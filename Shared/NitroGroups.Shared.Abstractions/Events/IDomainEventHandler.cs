namespace NitroGroups.Shared.Abstractions.Events
{
    public interface IDomainEventHandler<T> where T : IDomainEvent
    {
        Task Handle(T domainEvent, CancellationToken cancellationToken = default);
    }
}
