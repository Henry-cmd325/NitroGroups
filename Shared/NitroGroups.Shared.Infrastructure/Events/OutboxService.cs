using Cortex.Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Domain;
using NitroGroups.Shared.Infrastructure.Context;
using NitroGroups.Shared.Infrastructure.Context.Entities;
using System.Text.Json;

namespace NitroGroups.Shared.Infrastructure.Events
{
    public class OutboxService(
        NitroGroupsContext context,
        ILogger<OutboxService> logger,
        IMediator mediator,
        IEventProvider eventProvider) : IOutboxService
    {
        private readonly NitroGroupsContext _context = context;
        private readonly ILogger<OutboxService> _logger = logger;
        private readonly IMediator _mediator = mediator;
        private readonly IEventProvider _eventProvider = eventProvider;
        
        public async Task SaveEventAsync(IDomainEvent domainEvent)
        {
            var outboxEvent = new OutboxEvent
            {
                EventId = domainEvent.EventId,
                EventType = domainEvent.EventType,
                EventData = JsonSerializer.Serialize(domainEvent, domainEvent.GetType()),
                CreatedAt = domainEvent.OccurredAt
            };

            _context.OutboxEvents.Add(outboxEvent);
            await _context.SaveChangesAsync();

            _logger.LogDebug("Event saved to outbox: {EventType} with ID: {EventId}",
                domainEvent.EventType, domainEvent.EventId);
        }

        public async Task SaveEventsAsync(IEnumerable<IDomainEvent> domainEvents)
        {
            var outboxEvents = domainEvents.Select(domainEvent => new OutboxEvent
            {
                EventId = domainEvent.EventId,
                EventType = domainEvent.EventType,
                EventData = JsonSerializer.Serialize(domainEvent, domainEvent.GetType()),
                CreatedAt = domainEvent.OccurredAt
            }).ToList();

            if (outboxEvents.Count != 0)
            {
                _context.OutboxEvents.AddRange(outboxEvents);
                await _context.SaveChangesAsync();

                _logger.LogDebug("Saved {EventCount} events to outbox", outboxEvents.Count);
            }
        }

        public async Task ProcessPendingEventsAsync()
        {
            var pendingEvents = await _context.OutboxEvents
                .Where(e => !e.Processed && (e.NextRetryAt == null || e.NextRetryAt <= DateTime.UtcNow))
                .OrderBy(e => e.CreatedAt)
                .Take(10)
                .ToListAsync();

            foreach (var outboxEvent in pendingEvents)
            {
                try
                {
                    await ProcessEventAsync(outboxEvent);
                    await MarkEventAsProcessedAsync(outboxEvent.EventId);

                    _logger.LogDebug("Processed outbox event: {EventType} with ID: {EventId}",
                        outboxEvent.EventType, outboxEvent.EventId);
                }
                catch (Exception ex)
                {
                    await MarkEventAsFailedAsync(outboxEvent.EventId, ex.Message);

                    _logger.LogError(ex, "Failed to process outbox event: {EventType} with ID: {EventId}",
                        outboxEvent.EventType, outboxEvent.EventId);
                }
            }
        }

        private async Task ProcessEventAsync(OutboxEvent outboxEvent)
        {
            var eventType = _eventProvider.GetEventTypeByName(outboxEvent.EventType)
                ?? throw new InvalidOperationException($"Event type {outboxEvent.EventType} not found, make sure you used RegisterEventsFromAssembly in your Module");

            var domainEvent = JsonSerializer.Deserialize(outboxEvent.EventData, eventType)
                ?? throw new InvalidOperationException($"Failed to deserialize event {outboxEvent.EventType}");
            
            await _mediator.PublishAsync((dynamic)domainEvent);
        }

        public async Task MarkEventAsProcessedAsync(Guid eventId)
        {
            var outboxEvent = await _context.OutboxEvents
                .FirstOrDefaultAsync(e => e.EventId == eventId);

            if (outboxEvent != null)
            {
                outboxEvent.Processed = true;
                outboxEvent.ProcessedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task MarkEventAsFailedAsync(Guid eventId, string error)
        {
            var outboxEvent = await _context.OutboxEvents
                .FirstOrDefaultAsync(e => e.EventId == eventId);

            if (outboxEvent != null)
            {
                outboxEvent.RetryCount++;
                outboxEvent.LastError = error;

                var delayMinutes = Math.Min(Math.Pow(2, outboxEvent.RetryCount), 60);
                outboxEvent.NextRetryAt = DateTime.UtcNow.AddMinutes(delayMinutes);

                await _context.SaveChangesAsync();
            }
        }
    }
}

