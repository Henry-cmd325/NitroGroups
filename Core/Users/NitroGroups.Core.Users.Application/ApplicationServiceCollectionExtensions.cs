using Cortex.Mediator.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace NitroGroups.Core.Users.Application
{
    public static class ApplicationServiceCollectionExtensions
    {
        public static IServiceCollection AddUsersApplication(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddAutoMapper(cfg =>
            {
                cfg.AddMaps(typeof(ApplicationServiceCollectionExtensions).Assembly);
            });

            services.AddCortexMediator(configuration, [typeof(ApplicationServiceCollectionExtensions)]);

            return services;
        }
    }
}
