using Cortex.Mediator.DependencyInjection;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace NitroGroups.Core.Groups.Application
{
    public static class ApplicationServiceCollectionExtensions
    {
        public static IServiceCollection AddGroupsApplication(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddAutoMapper(cfg =>
            {
                cfg.AddMaps(typeof(ApplicationServiceCollectionExtensions).Assembly);
            });

            services.AddValidatorsFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly);

            services.AddCortexMediator(configuration, [typeof(ApplicationServiceCollectionExtensions)]);

            return services;
        }
    }
}
