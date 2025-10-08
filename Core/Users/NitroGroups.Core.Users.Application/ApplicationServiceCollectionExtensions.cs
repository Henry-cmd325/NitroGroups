using Cortex.Mediator.DependencyInjection;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Users.Application.Validators;

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

            services.AddValidatorsFromAssemblyContaining<CreateUserRequestValidator>();

            services.AddCortexMediator(configuration, [typeof(ApplicationServiceCollectionExtensions)]);

            return services;
        }
    }
}
