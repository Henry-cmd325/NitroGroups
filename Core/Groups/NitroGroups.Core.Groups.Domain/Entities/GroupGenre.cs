using NitroGroups.Shared.Domain;

namespace NitroGroups.Core.Groups.Domain.Entities;

public class GroupGenre : DomainModel
{
    public long GroupId { get; set; }
    public long GenreId { get; set; }
    public bool IsPrimary { get; set; }

    public virtual Group Group { get; set; } = null!;
    public virtual MusicGenre Genre { get; set; } = null!;
}
