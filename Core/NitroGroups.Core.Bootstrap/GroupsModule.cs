using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Groups.Application;
using NitroGroups.Core.Groups.Infrastructure;

namespace NitroGroups.Core.Bootstrap
{
    public static class GroupsModule
    {
        public static IServiceCollection AddGroupsModule(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddGroupsApplication(configuration);
            services.AddGroupsInfrastructure();

            return services;
        }
    }
}
