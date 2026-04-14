namespace NitroGroups.Shared.Contracts.Groups.Responses;

public class GenreListResponse
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ColorHex { get; set; }
}
