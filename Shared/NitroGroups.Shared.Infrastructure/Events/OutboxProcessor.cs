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

                    // Procesar eventos cada 5 segundos
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    // Graceful shutdown — exit the loop
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing outbox events");
                    
                    // Wait before retrying even on error
                    try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                    catch (OperationCanceledException) { break; }
                }
            }

            _logger.LogInformation("OutboxProcessor stopped");
        }
    }
}
