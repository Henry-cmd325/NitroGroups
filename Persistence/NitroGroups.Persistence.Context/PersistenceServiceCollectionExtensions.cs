using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace NitroGroups.Persistence.Context
{
    public static class PersistenceServiceCollectionExtensions
    {
        public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<NitroGroupsContext>(options => 
                options.UseNpgsql(configuration.GetConnectionString("NitroGroupsConnection"))
            );

            return services;
        }
    }
}
