namespace NitroGroups.Shared.Contracts.Groups.Responses;

public class GroupMediaResponse
{
    public long Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Title { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsPrimary { get; set; }
}
