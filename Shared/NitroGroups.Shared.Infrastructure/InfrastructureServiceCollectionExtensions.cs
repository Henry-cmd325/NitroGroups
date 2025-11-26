using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Infrastructure.Events;

namespace NitroGroups.Shared.Infrastructure
{
    public static class InfrastructureServiceCollectionExtensions
    {
        public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services)
        {
            services.AddSingleton<IEventProvider, EventProvider>();
            services.AddScoped<IOutboxService, OutboxService>();
            services.AddHostedService<OutboxProcessor>();

            return services;
        }
    }
}
