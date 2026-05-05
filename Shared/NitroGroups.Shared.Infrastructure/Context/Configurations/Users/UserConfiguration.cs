using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Users.Domain.Entities;


namespace NitroGroups.Shared.Infrastructure.Context.Configurations.Users
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("users");

            builder.HasKey(u => u.Id);
            builder.Property(u => u.Id)
                .HasColumnName("id");

            builder.Property(u => u.Auth0Id)
                .IsRequired()
                .HasMaxLength(100)
                .HasColumnName("auth0_id");

            builder.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(150)
                .HasColumnName("email");

            builder.Property(u => u.FirstName)
                .IsRequired()
                .HasMaxLength(100)
                .HasColumnName("first_name");

            builder.Property(u => u.LastName)
                .IsRequired()
                .HasMaxLength(100)
                .HasColumnName("last_name");

            builder.Property(u => u.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");

            builder.Property(u => u.UserType)
                .HasMaxLength(20)
                .HasColumnName("user_type");

            builder.Property(u => u.ProfilePictureUrl)
                .HasMaxLength(500)
                .HasColumnName("profile_picture_url");

            builder.Property(u => u.LocationText)
                .HasMaxLength(200)
                .HasColumnName("location_text");

            builder.Property(u => u.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .HasColumnName("created_at");

            builder.Property(u => u.LastLoginAt)
                .IsRequired(false)
                .HasColumnName("last_login_at");

            builder.Property(u => u.EmailVerified)
                .HasDefaultValue(false)
                .HasColumnName("email_verified");

            builder.Property(u => u.PhoneVerified)
                .HasDefaultValue(false)
                .HasColumnName("phone_verified");

            builder.Property(u => u.Active)
                .HasDefaultValue(true)
                .HasColumnName("active");

            builder.HasIndex(u => u.Auth0Id)
                .HasDatabaseName("IX_users_auth0_id");
            builder.HasIndex(u => u.Email)
                .HasDatabaseName("IX_users_email");
        }
    }
}
