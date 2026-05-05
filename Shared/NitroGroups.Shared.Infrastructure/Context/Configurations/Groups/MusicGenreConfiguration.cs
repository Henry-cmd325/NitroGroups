using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Groups.Domain.Entities;

namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Groups;

public class MusicGenreConfiguration : IEntityTypeConfiguration<MusicGenre>
{
    public void Configure(EntityTypeBuilder<MusicGenre> builder)
    {
        builder.ToTable("music_genres");

        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id).HasColumnName("id");
        builder.Property(g => g.Name).IsRequired().HasMaxLength(100).HasColumnName("name");
        builder.Property(g => g.Slug).IsRequired().HasMaxLength(120).HasColumnName("slug");
        builder.Property(g => g.Description).HasColumnType("text").HasColumnName("description");
        builder.Property(g => g.IconUrl).HasMaxLength(500).HasColumnName("icon_url");
        builder.Property(g => g.ColorHex).HasMaxLength(7).HasColumnName("color_hex");
        builder.Property(g => g.IsActive).HasDefaultValue(true).HasColumnName("is_active");

        builder.HasIndex(g => g.Name).IsUnique();
        builder.HasIndex(g => g.Slug).IsUnique();
    }
}
