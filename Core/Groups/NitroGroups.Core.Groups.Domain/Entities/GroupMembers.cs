using NitroGroups.Shared.Domain;

namespace NitroGroups.Core.Groups.Domain.Entities
{
    public enum GroupMemberRole
    {
        Leader,
        Member,
        Guest
    }

    public enum JoinedVia
    {
        Request,
        Invitation, 
        Manual
    }

    public class GroupMember : DomainModel
    {
        public long GroupId { get; set; }
        public long UserId { get; set; }
        public GroupMemberRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime JoinedAt { get; set; }
        public DateTime LeftAt { get; set; }
        public JoinedVia JoinedVia { get; set; }
        public int ApprovedBy { get; set; }

        public virtual Group Group { get; set; } = null!;
    }
}
