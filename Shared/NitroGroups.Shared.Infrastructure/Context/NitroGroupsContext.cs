using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Domain;
using NitroGroups.Shared.Infrastructure.Context.Entities;
using System.Linq.Expressions;

namespace NitroGroups.Shared.Infrastructure.Context
{
    public class NitroGroupsContext(DbContextOptions<NitroGroupsContext> options) : DbContext(options)
    {
        public DbSet<User> Users { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<GroupMember> GroupMembers { get; set; }
        public DbSet<MusicGenre> MusicGenres { get; set; }
        public DbSet<GroupGenre> GroupGenres { get; set; }
        public DbSet<GroupMedia> GroupMedia { get; set; }
        public DbSet<OutboxEvent> OutboxEvents { get; set; }
        public DbSet<GroupAvailability> GroupAvailabilities { get; set; }
        public DbSet<BusySchedule> BusySchedules { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {            
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(NitroGroupsContext).Assembly);

            // Buscamos todas las entidades que implementan IAuditable
            var auditableTypes = modelBuilder.Model.GetEntityTypes()
                .Where(et => typeof(IAuditable).IsAssignableFrom(et.ClrType));

            foreach (var entityType in auditableTypes)
            {
                // Creamos la expresión de filtro: e => e.DeletedAt == null
                // 1. Creamos el parámetro: (T e)
                var parameter = Expression.Parameter(entityType.ClrType, "e");

                // 2. Obtenemos la propiedad "DeletedAt" asegurando el tipo DateTime?
                var propertyMethod = typeof(EF).GetMethod("Property")?.MakeGenericMethod(typeof(DateTime?));
                var deletedAtProperty = Expression.Call(propertyMethod!, parameter, Expression.Constant(nameof(IAuditable.DeletedAt)));

                // 3. Creamos la comparación: e.DeletedAt == (DateTime?)null
                // Usamos Expression.Constant(null, typeof(DateTime?)) para evitar ambigüedades
                var compareExpression = Expression.Equal(deletedAtProperty, Expression.Constant(null, typeof(DateTime?)));

                // 4. Generamos la Lambda: e => e.DeletedAt == null
                var lambda = Expression.Lambda(compareExpression, parameter);

                // Aplicamos el filtro global
                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);

                //Esto hace que todas las consultas a esta entidad excluyan los registros donde DeletedAt no es null
                //Si en algun momento queremos incluir los eliminados, debemos usar el método IgnoreQueryFilters() en la consulta
            }
        }
    }
}
