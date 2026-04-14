using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Schedules.Domain.Entities;

namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Schedules;

public class BusyScheduleConfiguration : IEntityTypeConfiguration<BusySchedule>
{
    public void Configure(EntityTypeBuilder<BusySchedule> builder)
    {
        builder.ToTable("busy_schedules");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.GroupId).HasColumnName("group_id").IsRequired();
        builder.Property(e => e.Title).HasColumnName("title").HasMaxLength(200);
        builder.Property(e => e.Description).HasColumnName("description").HasMaxLength(500);
        
        builder.Property(e => e.Source)
            .HasColumnName("source")
            .HasConversion<string>()
            .HasDefaultValue(BusyScheduleSource.Contract);

        builder.Property(e => e.ContractId).HasColumnName("contract_id");
        builder.Property(e => e.StartAt).HasColumnName("start_at").IsRequired();
        builder.Property(e => e.EndAt).HasColumnName("end_at").IsRequired();

        builder.HasIndex(e => new { e.GroupId, e.StartAt });
        builder.HasIndex(e => e.ContractId);
        builder.HasIndex(e => new { e.GroupId, e.StartAt, e.EndAt });
    }
}
