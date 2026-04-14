using NitroGroups.Shared.Domain;

namespace NitroGroups.Core.Groups.Domain.Entities;

public class MusicGenre : DomainModel
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public string? ColorHex { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual ICollection<GroupGenre> GroupGenres { get; set; } = [];
}
