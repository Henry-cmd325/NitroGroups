using NitroGroups.Shared.Domain;

namespace NitroGroups.Core.Groups.Domain.Entities;

public class GroupSong : DomainModel
{
    public long GroupId { get; set; }
    public string TrackId { get; set; } = string.Empty;

    public virtual Group Group { get; set; } = null!;
}
