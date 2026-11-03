using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Shared.Abstractions.Repository;
using NitroGroups.Shared.Infrastructure.Context.Interceptors;
using NitroGroups.Shared.Infrastructure.Events;
using NitroGroups.Shared.Infrastructure.Repository;

namespace NitroGroups.Shared.Infrastructure.Persistence
{
    public static class ModulePersistenceExtensions
    {
        public const string ConnectionStringName = "NitroGroupsConnection";
        public const string MigrationsHistoryTable = "__ef_migrations_history";

        /// <summary>
        /// Registra el DbContext de un módulo (Npgsql, esquema propio, auditoría) y su outbox.
        /// Todos los módulos comparten la misma base de datos, pero no las tablas.
        /// </summary>
        public static IServiceCollection AddModuleDbContext<TContext>(
            this IServiceCollection services,
            IConfiguration configuration,
            string schema)
            where TContext : ModuleDbContext
        {
            services.AddDbContext<TContext>((sp, options) =>
            {
                options.UseNpgsql(
                        configuration.GetConnectionString(ConnectionStringName),
                        npgsql => npgsql.MigrationsHistoryTable(MigrationsHistoryTable, schema))
                    .AddInterceptors(sp.GetRequiredService<AuditInterceptor>());
            });

            services.AddScoped<OutboxService<TContext>>();
            RegisterOutbox<TContext>(services);

            return services;
        }

        /// <summary>
        /// Registra <see cref="IGenericRepository{TEntity, TKey}"/> para una entidad usando el
        /// DbContext de su módulo.
        /// </summary>
        public static IServiceCollection AddModuleRepository<TContext, TEntity>(this IServiceCollection services)
            where TContext : DbContext
            where TEntity : class
        {
            services.AddScoped<IGenericRepository<TEntity, long>>(sp =>
                new GenericRepository<TEntity, long>(sp.GetRequiredService<TContext>()));
            return services;
        }

        /// <summary>
        /// Registra el UnitOfWork de un módulo inyectándole el outbox de su propio DbContext.
        /// </summary>
        public static IServiceCollection AddModuleUnitOfWork<TService, TImplementation, TContext>(this IServiceCollection services)
            where TService : class
            where TImplementation : class, TService
            where TContext : ModuleDbContext
        {
            services.AddScoped<TService>(sp => ActivatorUtilities.CreateInstance<TImplementation>(
                sp, sp.GetRequiredService<OutboxService<TContext>>()));
            return services;
        }

        private static void RegisterOutbox<TContext>(IServiceCollection services) where TContext : ModuleDbContext
        {
            var registry = services
                .Where(d => d.ServiceType == typeof(OutboxModuleRegistry))
                .Select(d => d.ImplementationInstance)
                .OfType<OutboxModuleRegistry>()
                .FirstOrDefault();

            if (registry is null)
            {
                registry = new OutboxModuleRegistry();
                services.AddSingleton(registry);
            }

            registry.Register(typeof(TContext));
        }
    }
}
