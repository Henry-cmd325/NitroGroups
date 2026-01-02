using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Groups.Application;
using NitroGroups.Core.Users.Application;
using NitroGroups.Core.Users.Infrastructure;

namespace NitroGroups.Core.Bootstrap
{
    public static class UsersModule
    {
        public static IServiceCollection AddUsersModule(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddUsersApplication(configuration);
            services.AddUsersInfrastructure();

            return services;
        }
    }
}
