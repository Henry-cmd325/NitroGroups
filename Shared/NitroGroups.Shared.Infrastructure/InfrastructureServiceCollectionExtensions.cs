using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Abstractions.Repository;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Infrastructure.Context;
using NitroGroups.Shared.Infrastructure.Context.Interceptors;
using NitroGroups.Shared.Infrastructure.Events;
using NitroGroups.Shared.Infrastructure.Repository;
using NitroGroups.Shared.Infrastructure.Services;

namespace NitroGroups.Shared.Infrastructure
{
    public static class InfrastructureServiceCollectionExtensions
    {
        public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddScoped<ICurrentUserService, CurrentUserService>();

            services.AddScoped<AuditInterceptor>();

            services.AddDbContext<NitroGroupsContext>((sp, options) =>
            {
                var auditInterceptor = sp.GetRequiredService<AuditInterceptor>();

                options.UseNpgsql(configuration.GetConnectionString("NitroGroupsConnection"))
                       .AddInterceptors(auditInterceptor);
            });

            services.AddSingleton<IEventProvider, EventProvider>();
            services.AddScoped<IOutboxService, OutboxService>();
            services.AddHostedService<OutboxProcessor>();
            services.AddScoped(typeof(IGenericRepository<,>), typeof(GenericRepository<,>));

            return services;
        }
    }
}
