using Microsoft.EntityFrameworkCore;
using NitroGroups.Shared.Domain;
using NitroGroups.Shared.Infrastructure.Context.Configurations.Outbox;
using NitroGroups.Shared.Infrastructure.Context.Entities;
using System.Linq.Expressions;

namespace NitroGroups.Shared.Infrastructure.Persistence
{
    /// <summary>
    /// Base para el DbContext de cada módulo (monolito modular).
    /// Cada módulo vive en su propio esquema de PostgreSQL, tiene su propia tabla de
    /// historial de migraciones y su propia tabla de outbox, de modo que ningún módulo
    /// necesita conocer las entidades de otro.
    /// </summary>
    public abstract class ModuleDbContext(DbContextOptions options) : DbContext(options)
    {
        /// <summary>Esquema de PostgreSQL del módulo (p. ej. "users", "groups").</summary>
        public abstract string Schema { get; }

        public DbSet<OutboxEvent> OutboxEvents => Set<OutboxEvent>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasDefaultSchema(Schema);

            modelBuilder.ApplyConfiguration(new OutboxEventConfiguration());

            // Solo las configuraciones del ensamblado del módulo (no las de otros módulos).
            modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);

            ApplySoftDeleteFilter(modelBuilder);
        }

        /// <summary>
        /// Las entidades <see cref="IAuditable"/> se borran de forma lógica
        /// (ver <c>AuditInterceptor</c>); por eso se excluyen de todas las consultas
        /// los registros con <c>DeletedAt</c>. Usa <c>IgnoreQueryFilters()</c> para verlos.
        /// </summary>
        private static void ApplySoftDeleteFilter(ModelBuilder modelBuilder)
        {
            var auditableTypes = modelBuilder.Model.GetEntityTypes()
                .Where(et => typeof(IAuditable).IsAssignableFrom(et.ClrType));

            foreach (var entityType in auditableTypes)
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var propertyMethod = typeof(EF).GetMethod(nameof(EF.Property))!.MakeGenericMethod(typeof(DateTime?));
                var deletedAt = Expression.Call(propertyMethod, parameter, Expression.Constant(nameof(IAuditable.DeletedAt)));
                var isNotDeleted = Expression.Equal(deletedAt, Expression.Constant(null, typeof(DateTime?)));

                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(Expression.Lambda(isNotDeleted, parameter));
            }
        }
    }
}
