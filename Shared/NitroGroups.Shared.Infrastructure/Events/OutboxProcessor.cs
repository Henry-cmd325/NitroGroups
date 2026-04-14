using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Shared.Infrastructure.Events
{
    public class OutboxProcessor(IServiceProvider serviceProvider, ILogger<OutboxProcessor> logger) : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider = serviceProvider;
        private readonly ILogger<OutboxProcessor> _logger = logger;

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OutboxProcessor started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await using var scope = _serviceProvider.CreateAsyncScope();
                    var outboxService = scope.ServiceProvider.GetRequiredService<IOutboxService>();
                    
                    await outboxService.ProcessPendingEventsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing outbox events");
                }

                // Procesar eventos cada 5 segundos
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }

            _logger.LogInformation("OutboxProcessor stopped");
        }
    }
}
