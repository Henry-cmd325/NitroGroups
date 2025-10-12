using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Shared.Abstractions.Services
{
    public interface IOutboxService
    {
        Task SaveEventAsync(IDomainEvent domainEvent);
        Task SaveEventsAsync(IEnumerable<IDomainEvent> domainEvents);
        Task ProcessPendingEventsAsync();
        Task MarkEventAsProcessedAsync(Guid eventId);
        Task MarkEventAsFailedAsync(Guid eventId, string error);
    }
}
