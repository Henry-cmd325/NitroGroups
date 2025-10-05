using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Users.Domain.Entities;

namespace NitroGroups.Persistence.Context
{
    public class NitroGroupsContext(DbContextOptions<NitroGroupsContext> options) : DbContext(options)
    {
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configurar enum a nivel de base de datos
            modelBuilder.HasPostgresEnum("user_type_enum", "user_type", []);
            
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(NitroGroupsContext).Assembly);
        }
    }
}
