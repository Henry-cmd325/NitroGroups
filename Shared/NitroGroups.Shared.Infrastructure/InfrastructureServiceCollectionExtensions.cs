using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Abstractions.Repository;
using NitroGroups.Shared.Infrastructure.Events;
using NitroGroups.Shared.Infrastructure.Repository;

namespace NitroGroups.Shared.Infrastructure
{
    public static class InfrastructureServiceCollectionExtensions
    {
        public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services)
        {
            services.AddSingleton<IEventProvider, EventProvider>();
            services.AddScoped<IOutboxService, OutboxService>();
            services.AddHostedService<OutboxProcessor>();
            services.AddScoped(typeof(IGenericRepository<,>), typeof(GenericRepository<,>));

            return services;
        }
    }
}
