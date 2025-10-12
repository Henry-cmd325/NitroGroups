using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NitroGroups.Persistence.Context.Entities;

namespace NitroGroups.Persistence.Context.Configurations.Outbox
{
    public class OutboxEventConfiguration : IEntityTypeConfiguration<OutboxEvent>
    {
        public void Configure(EntityTypeBuilder<OutboxEvent> builder)
        {
            builder.ToTable("outbox_events");

            builder.HasKey(e => e.Id);

            builder.Property(e => e.Id)
                .HasColumnName("id");

            builder.Property(e => e.EventId)
                .HasColumnName("event_id")
                .IsRequired();

            builder.Property(e => e.EventType)
                .HasColumnName("event_type")
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(e => e.EventData)
                .HasColumnName("event_data")
                .IsRequired();

            builder.Property(e => e.Processed)
                .HasColumnName("processed")
                .HasDefaultValue(false);

            builder.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            builder.Property(e => e.ProcessedAt)
                .HasColumnName("processed_at");

            builder.Property(e => e.RetryCount)
                .HasColumnName("retry_count")
                .HasDefaultValue(0);

            builder.Property(e => e.LastError)
                .HasColumnName("last_error")
                .HasMaxLength(1000);

            builder.Property(e => e.NextRetryAt)
                .HasColumnName("next_retry_at");

            // Índices para optimizar consultas
            builder.HasIndex(e => e.Processed)
                .HasDatabaseName("ix_outbox_events_processed");

            builder.HasIndex(e => e.EventType)
                .HasDatabaseName("ix_outbox_events_event_type");

            builder.HasIndex(e => e.CreatedAt)
                .HasDatabaseName("ix_outbox_events_created_at");

            builder.HasIndex(e => e.NextRetryAt)
                .HasDatabaseName("ix_outbox_events_next_retry_at");
        }
    }
}
