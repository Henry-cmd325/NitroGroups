using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Infrastructure.Services;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Users.Infrastructure
{
    public static class InfrastructureServiceCollectionExtensions
    { 
        public static IServiceCollection AddUsersInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<IUserService, UserService>();

            services.AddEndpoints(typeof(InfrastructureServiceCollectionExtensions).Assembly);

            return services;
        }
    }
}
