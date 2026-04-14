using NitroGroups.Shared.Domain;

namespace NitroGroups.Core.Groups.Domain.Entities;

public enum MediaType
{
    Photo,
    Video,
    Audio
}

public class GroupMedia : AuditableModel
{
    public long GroupId { get; set; }
    public MediaType Type { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public long? FileSizeBytes { get; set; }
    public int? DurationSeconds { get; set; }
    public bool IsPrimary { get; set; }
    public int DisplayOrder { get; set; }

    public virtual Group Group { get; set; } = null!;
}
