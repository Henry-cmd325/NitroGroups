using System.ComponentModel.DataAnnotations;

namespace NitroGroups.Persistence.Context.Entities
{
    public class OutboxEvent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public Guid EventId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string EventType { get; set; } = null!;
        
        [Required]
        public string EventData { get; set; } = null!; // JSON serializado
        
        public bool Processed { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ProcessedAt { get; set; }
        
        public int RetryCount { get; set; } = 0;
        
        [MaxLength(1000)]
        public string? LastError { get; set; }
        
        public DateTime? NextRetryAt { get; set; }
    }
}
