using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Schedules.Application;
using NitroGroups.Core.Schedules.Infrastructure;

namespace NitroGroups.Core.Bootstrap
{
    public static class SchedulesModule
    {
        public static IServiceCollection AddSchedulesModule(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddSchedulesApplication(configuration);
            services.AddSchedulesInfrastructure(configuration);

            return services;
        }
    }
}
