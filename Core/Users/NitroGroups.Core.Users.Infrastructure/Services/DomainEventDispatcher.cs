using NitroGroups.Shared.Abstractions.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class DomainEventDispatcher : IDomainEventDispatcher
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DomainEventDispatcher> _logger;

        public DomainEventDispatcher(IServiceProvider serviceProvider, ILogger<DomainEventDispatcher> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public async Task DispatchAsync(IDomainEvent domainEvent, CancellationToken cancellationToken = default)
        {
            var eventType = domainEvent.GetType();
            var handlerType = typeof(IDomainEventHandler<>).MakeGenericType(eventType);

            _logger.LogInformation("Dispatching domain event: {EventType} with ID: {EventId}", 
                eventType.Name, domainEvent.EventId);

            var handlers = _serviceProvider.GetServices(handlerType).ToList();
            
            foreach (var handler in handlers)
            {
                try
                {
                    var method = handlerType.GetMethod("Handle");
                    var task = (Task)method!.Invoke(handler, new object[] { domainEvent, cancellationToken })!;
                    await task;
                    
                    _logger.LogDebug("Domain event handler processed successfully: {HandlerType}", 
                        handler.GetType().Name);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing domain event {EventType} with handler {HandlerType}", 
                        eventType.Name, handler.GetType().Name);
                    throw;
                }
            }
            
            _logger.LogInformation("Domain event {EventType} dispatched successfully to {HandlerCount} handlers", 
                eventType.Name, handlers.Count);
        }
    }
}
