using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Core.Bookings.Domain.Entities;

namespace NitroGroups.Core.Bookings.Infrastructure.Persistence.Configurations;

public class EventRequestMessageConfiguration : IEntityTypeConfiguration<EventRequestMessage>
{
    public void Configure(EntityTypeBuilder<EventRequestMessage> builder)
    {
        builder.ToTable("event_request_messages");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.EventRequestId).HasColumnName("event_request_id").IsRequired();
        builder.Property(m => m.SenderUserId).HasColumnName("sender_user_id").IsRequired();
        builder.Property(m => m.SenderParty).HasColumnName("sender_party").HasConversion<int>().IsRequired();
        builder.Property(m => m.Body).HasColumnName("body").HasMaxLength(EventRequestMessage.MaxBodyLength).IsRequired();
        builder.Property(m => m.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        builder.HasIndex(m => new { m.EventRequestId, m.CreatedAt });
    }
}
