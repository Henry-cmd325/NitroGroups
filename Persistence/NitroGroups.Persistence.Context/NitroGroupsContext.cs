using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Persistence.Context.Entities;

namespace NitroGroups.Persistence.Context
{
    public class NitroGroupsContext(DbContextOptions<NitroGroupsContext> options) : DbContext(options)
    {
        public DbSet<User> Users { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<GroupMember> GroupMembers { get; set; }
        public DbSet<OutboxEvent> OutboxEvents { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {            
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(NitroGroupsContext).Assembly);
        }
    }
}
