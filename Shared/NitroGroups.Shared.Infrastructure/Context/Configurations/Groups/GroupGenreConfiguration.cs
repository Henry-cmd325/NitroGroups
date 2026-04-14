using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Groups.Domain.Entities;

namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Groups;

public class GroupGenreConfiguration : IEntityTypeConfiguration<GroupGenre>
{
    public void Configure(EntityTypeBuilder<GroupGenre> builder)
    {
        builder.ToTable("group_genres");

        builder.HasKey(gg => gg.Id);
        builder.Property(gg => gg.Id).HasColumnName("id");
        builder.Property(gg => gg.GroupId).HasColumnName("group_id");
        builder.Property(gg => gg.GenreId).HasColumnName("genre_id");
        builder.Property(gg => gg.IsPrimary).HasDefaultValue(false).HasColumnName("is_primary");

        builder.HasOne(gg => gg.Group)
            .WithMany(g => g.Genres)
            .HasForeignKey(gg => gg.GroupId);

        builder.HasOne(gg => gg.Genre)
            .WithMany(mg => mg.GroupGenres)
            .HasForeignKey(gg => gg.GenreId);

        builder.HasIndex(gg => new { gg.GroupId, gg.GenreId }).IsUnique();
        builder.HasIndex(gg => gg.GroupId);
        builder.HasIndex(gg => gg.GenreId);
    }
}
