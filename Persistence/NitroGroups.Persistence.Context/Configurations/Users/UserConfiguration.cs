using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Users.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NitroGroups.Persistence.Context.Configurations.Users
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("users");

            // PK
            builder.HasKey(u => u.Id);

            // Propiedades
            builder.Property(u => u.Auth0Id)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(150);

            builder.Property(u => u.FirstName)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(u => u.LastName)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(u => u.Phone)
                .HasMaxLength(20);

            builder.Property(u => u.UserType)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(UserType.Client);

            builder.Property(u => u.ProfilePictureUrl)
                .HasMaxLength(500);

            builder.Property(u => u.LocationText)
                .HasMaxLength(200);

            builder.Property(u => u.CreatedAt)
                .HasDefaultValueSql("NOW()");

            builder.Property(u => u.LastLoginAt)
                .IsRequired(false);

            builder.Property(u => u.EmailVerified)
                .HasDefaultValue(false);

            builder.Property(u => u.PhoneVerified)
                .HasDefaultValue(false);

            builder.Property(u => u.Active)
                .HasDefaultValue(true);

            // Índices
            builder.HasIndex(u => u.Auth0Id);
            builder.HasIndex(u => u.Email);
        }
    }
}
