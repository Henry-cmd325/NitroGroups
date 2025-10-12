using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context.Entities;

namespace NitroGroups.Persistence.Context
{
    public class NitroGroupsContext(DbContextOptions<NitroGroupsContext> options) : DbContext(options)
    {
        public DbSet<User> Users { get; set; }
        public DbSet<OutboxEvent> OutboxEvents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configurar enum a nivel de base de datos
            modelBuilder.HasPostgresEnum("user_type_enum", "user_type", ["client", "band_member", "admin"]);
            
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(NitroGroupsContext).Assembly);
        }
    }
}
