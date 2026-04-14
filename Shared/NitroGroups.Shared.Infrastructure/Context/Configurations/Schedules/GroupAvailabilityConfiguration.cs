using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Schedules.Domain.Entities;

namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Schedules;

public class GroupAvailabilityConfiguration : IEntityTypeConfiguration<GroupAvailability>
{
    public void Configure(EntityTypeBuilder<GroupAvailability> builder)
    {
        builder.ToTable("group_availability");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.GroupId).HasColumnName("group_id").IsRequired();
        builder.Property(e => e.StartAt).HasColumnName("start_at").IsRequired();
        builder.Property(e => e.EndAt).HasColumnName("end_at").IsRequired();
        builder.Property(e => e.Available).HasColumnName("available").HasDefaultValue(true);
        builder.Property(e => e.CustomPrice).HasColumnName("custom_price").HasColumnType("decimal(12,2)");
        builder.Property(e => e.Note).HasColumnName("note").HasMaxLength(200);
        builder.Property(e => e.RRule).HasColumnName("rrule");
        builder.Property(e => e.Timezone).HasColumnName("timezone").HasMaxLength(50).HasDefaultValue("UTC");

        // Assuming CreatedAt / UpdatedAt handled by AuditableModel base interceptor
        
        builder.HasIndex(e => new { e.GroupId, e.StartAt });
        builder.HasIndex(e => new { e.GroupId, e.Available });
        builder.HasIndex(e => new { e.GroupId, e.StartAt, e.EndAt });
    }
}
