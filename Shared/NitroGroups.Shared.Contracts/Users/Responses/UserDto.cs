using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Shared.Contracts.Users.Responses
{
    public class UserDto
    {
        public int Id { get; set; }
        public string Auth0Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public UserType UserType { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? LocationText { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public bool EmailVerified { get; set; }
        public bool PhoneVerified { get; set; }
        public bool Active { get; set; }
    }
}
