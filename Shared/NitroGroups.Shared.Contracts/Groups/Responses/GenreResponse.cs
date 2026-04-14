namespace NitroGroups.Shared.Contracts.Groups.Responses;

public class GenreResponse
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ColorHex { get; set; }
    public bool IsPrimary { get; set; }
}
