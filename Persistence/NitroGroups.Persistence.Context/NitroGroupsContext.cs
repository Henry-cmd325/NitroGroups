using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Users.Domain.Entities;

namespace NitroGroups.Persistence.Context
{
    public class NitroGroupsContext(DbContextOptions<NitroGroupsContext> options) : DbContext(options)
    {
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(NitroGroupsContext).Assembly);
        }
    }
}
