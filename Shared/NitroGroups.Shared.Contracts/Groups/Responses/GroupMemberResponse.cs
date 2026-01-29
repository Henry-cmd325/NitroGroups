using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;

namespace NitroGroups.Shared.Contracts.Groups.Responses
{
    public class GroupMemberResponse
    {
        public long Id { get; set; }
        public long GroupId { get; set; }
        public long UserId { get; set; }
        public GroupMemberRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime JoinedAt { get; set; }
        public DateTime LeftAt { get; set; }
        public JoinedVia JoinedVia { get; set; }
        public int ApprovedBy { get; set; }
    }
}
