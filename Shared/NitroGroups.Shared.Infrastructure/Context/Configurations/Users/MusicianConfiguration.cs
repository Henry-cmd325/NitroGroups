using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Users.Domain.Entities;

namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Users
{
    public class MusicianConfiguration : IEntityTypeConfiguration<Musician>
    {
        public void Configure(EntityTypeBuilder<Musician> builder)
        {
            builder.ToTable("musicians");

            builder.HasKey(m => m.Id);

            builder.Property(m => m.UserId)
                .HasColumnName("user_id");

            builder.Property(m => m.YearsExperience)
                .HasColumnName("years_experience")
                .HasDefaultValue(0);

            builder.Property(m => m.ShortBio)
                .HasMaxLength(800)
                .HasColumnName("short_bio")
                .IsRequired(false);

            builder.Property(m => m.IsOpenToJoin)
                .HasColumnName("is_open_to_join")
                .HasDefaultValue(true);

            builder.HasOne(m => m.User)
                .WithOne(u => u.Musician)
                .HasForeignKey<Musician>(m => m.UserId)
                .IsRequired();

            builder.HasIndex(m => m.UserId)
                .IsUnique()
                .HasDatabaseName("IX_musicians_user_id");
        }
    }
}
