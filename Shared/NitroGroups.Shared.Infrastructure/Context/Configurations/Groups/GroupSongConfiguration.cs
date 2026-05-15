using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Groups.Domain.Entities;

namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Groups;

public class GroupSongConfiguration : IEntityTypeConfiguration<GroupSong>
{
    public void Configure(EntityTypeBuilder<GroupSong> builder)
    {
        builder.ToTable("group_songs");

        builder.HasKey(gs => gs.Id);
        builder.Property(gs => gs.Id).HasColumnName("id");

        builder.Property(gs => gs.GroupId).IsRequired().HasColumnName("group_id");
        builder.Property(gs => gs.TrackId).IsRequired().HasMaxLength(64).HasColumnName("track_id");

        builder.HasOne(gs => gs.Group)
            .WithMany(g => g.Songs)
            .HasForeignKey(gs => gs.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(gs => new { gs.GroupId, gs.TrackId }).IsUnique();
    }
}
