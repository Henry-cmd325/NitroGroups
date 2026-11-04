using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Infrastructure.Persistence;

namespace NitroGroups.Core.Users.Infrastructure.Persistence
{
    public class UsersDbContext(DbContextOptions<UsersDbContext> options) : ModuleDbContext(options)
    {
        public const string SchemaName = "users";

        public override string Schema => SchemaName;

        public DbSet<User> Users => Set<User>();
        public DbSet<Musician> Musicians => Set<Musician>();
    }
}
