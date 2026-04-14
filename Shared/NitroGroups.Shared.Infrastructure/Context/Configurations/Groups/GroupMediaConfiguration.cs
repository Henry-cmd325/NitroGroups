using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Groups.Domain.Entities;

namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Groups;

public class GroupMediaConfiguration : IEntityTypeConfiguration<GroupMedia>
{
    public void Configure(EntityTypeBuilder<GroupMedia> builder)
    {
        builder.ToTable("group_media");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.GroupId).HasColumnName("group_id");
        builder.Property(m => m.Type).IsRequired().HasMaxLength(10).HasColumnName("type");
        builder.Property(m => m.Url).IsRequired().HasMaxLength(500).HasColumnName("url");
        builder.Property(m => m.ThumbnailUrl).HasMaxLength(500).HasColumnName("thumbnail_url");
        builder.Property(m => m.Title).HasMaxLength(200).HasColumnName("title");
        builder.Property(m => m.Description).HasColumnType("text").HasColumnName("description");
        builder.Property(m => m.FileSizeBytes).HasColumnName("file_size_bytes");
        builder.Property(m => m.DurationSeconds).HasColumnName("duration_seconds");
        builder.Property(m => m.IsPrimary).HasDefaultValue(false).HasColumnName("is_primary");
        builder.Property(m => m.DisplayOrder).HasDefaultValue(0).HasColumnName("display_order");

        builder.Property(m => m.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
        builder.Property(m => m.CreatedBy).HasColumnName("created_by");
        builder.Property(m => m.DeletedAt).HasColumnName("deleted_at");
        builder.Property(m => m.DeletedBy).HasColumnName("deleted_by");
        builder.Property(m => m.UpdatedAt).HasColumnName("updated_at");
        builder.Property(m => m.UpdatedBy).HasColumnName("updated_by");

        builder.HasOne(m => m.Group)
            .WithMany(g => g.Media)
            .HasForeignKey(m => m.GroupId);

        builder.HasIndex(m => new { m.GroupId, m.Type });
        builder.HasIndex(m => new { m.GroupId, m.DisplayOrder });
        builder.HasIndex(m => m.GroupId);
    }
}
