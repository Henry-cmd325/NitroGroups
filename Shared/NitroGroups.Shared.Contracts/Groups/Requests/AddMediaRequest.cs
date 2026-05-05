namespace NitroGroups.Shared.Contracts.Groups.Requests;

public class AddMediaRequest
{
    public string Type { get; set; } = "photo";
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? Title { get; set; }
    public int DisplayOrder { get; set; }
}
