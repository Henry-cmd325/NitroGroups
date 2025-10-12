using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NitroGroups.Persistence.Context;
using NitroGroups.Persistence.Context.Entities;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Abstractions.Services;
using System.Text.Json;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class OutboxService : IOutboxService
    {
        private readonly NitroGroupsContext _context;
        private readonly ILogger<OutboxService> _logger;
        private readonly IDomainEventDispatcher _eventDispatcher;

        public OutboxService(
            NitroGroupsContext context, 
            ILogger<OutboxService> logger,
            IDomainEventDispatcher eventDispatcher)
        {
            _context = context;
            _logger = logger;
            _eventDispatcher = eventDispatcher;
        }

        public async Task SaveEventAsync(IDomainEvent domainEvent)
        {
            var outboxEvent = new OutboxEvent
            {
                EventId = domainEvent.EventId,
                EventType = domainEvent.EventType,
                EventData = JsonSerializer.Serialize(domainEvent),
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
                EventData = JsonSerializer.Serialize(domainEvent),
                CreatedAt = domainEvent.OccurredAt
            }).ToList();

            _context.OutboxEvents.AddRange(outboxEvents);
            await _context.SaveChangesAsync();

            _logger.LogDebug("Saved {EventCount} events to outbox", outboxEvents.Count);
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
            // Deserializar el evento
            var eventType = Type.GetType($"NitroGroups.Core.Users.Domain.Events.{outboxEvent.EventType}");
            if (eventType == null)
            {
                throw new InvalidOperationException($"Event type {outboxEvent.EventType} not found");
            }

            var domainEvent = JsonSerializer.Deserialize(outboxEvent.EventData, eventType) as IDomainEvent;
            if (domainEvent == null)
            {
                throw new InvalidOperationException($"Failed to deserialize event {outboxEvent.EventType}");
            }

            // Procesar el evento
            await _eventDispatcher.DispatchAsync(domainEvent);
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
                
                // Backoff exponencial: 2^retryCount minutos
                var delayMinutes = Math.Min(Math.Pow(2, outboxEvent.RetryCount), 60);
                outboxEvent.NextRetryAt = DateTime.UtcNow.AddMinutes(delayMinutes);
                
                await _context.SaveChangesAsync();
            }
        }
    }
}
