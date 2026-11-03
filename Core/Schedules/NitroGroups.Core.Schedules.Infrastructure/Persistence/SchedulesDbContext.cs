using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Infrastructure.Persistence;

namespace NitroGroups.Core.Schedules.Infrastructure.Persistence
{
    public class SchedulesDbContext(DbContextOptions<SchedulesDbContext> options) : ModuleDbContext(options)
    {
        public const string SchemaName = "schedules";

        public override string Schema => SchemaName;

        public DbSet<GroupAvailability> GroupAvailabilities => Set<GroupAvailability>();
        public DbSet<BusySchedule> BusySchedules => Set<BusySchedule>();
    }
}
