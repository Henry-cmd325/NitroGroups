using System.Text.Json.Serialization;

namespace NitroGroups.Shared.Contracts.Groups.Responses;

public class GroupMediaResponse
{
    public long Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public long? FileSizeBytes { get; set; }
    public int? DurationSeconds { get; set; }
    /// <summary>ISO-8601 (created / upload time).</summary>
    public string? UploadedAt { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsPrimary { get; set; }
}

/// <summary>B2B groupMedia — list with cursor (Instagram-style feed).</summary>
public class GroupMediaListResponse
{
    [JsonPropertyName("items")]
    public List<GroupMediaResponse> Items { get; set; } = [];

    [JsonPropertyName("nextCursor")]
    public string? NextCursor { get; set; }
}
