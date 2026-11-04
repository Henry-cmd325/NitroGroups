using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Bookings.Application;
using NitroGroups.Core.Bookings.Infrastructure;

namespace NitroGroups.Core.Bootstrap
{
    public static class BookingsModule
    {
        public static IServiceCollection AddBookingsModule(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddBookingsApplication(configuration);
            services.AddBookingsInfrastructure(configuration);

            return services;
        }
    }
}
