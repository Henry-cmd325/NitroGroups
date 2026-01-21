using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Groups.Domain.Entities;

namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Groups;

public class GroupMemberConfiguration : IEntityTypeConfiguration<GroupMember>
{
    public void Configure(EntityTypeBuilder<GroupMember> builder)
    {
        builder.ToTable("group_members");

        builder.HasKey(gm => gm.Id);

        builder.Property(gm => gm.GroupId).HasColumnName("group_id");
        builder.Property(gm => gm.UserId).HasColumnName("user_id");

        builder.Property(gm => gm.Role)
            .HasColumnName("role");

        builder.Property(gm => gm.IsActive).HasDefaultValue(true).HasColumnName("is_active");
        builder.Property(gm => gm.JoinedAt).HasDefaultValueSql("now()").HasColumnName("joined_at");
        builder.Property(gm => gm.LeftAt).HasColumnName("left_at");

        builder.Property(gm => gm.JoinedVia)
            .HasColumnName("joined_via");

        builder.Property(gm => gm.ApprovedBy).HasColumnName("approved_by");

        builder.HasOne(gm => gm.Group)
            .WithMany(g => g.Members)
            .HasForeignKey(gm => gm.GroupId);
        
        builder.HasIndex(gm => new { gm.GroupId, gm.UserId }).IsUnique();
        builder.HasIndex(gm => new { gm.GroupId, gm.IsActive });
    }
}