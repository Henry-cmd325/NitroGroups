using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Shared.Contracts.Users.Requests
{
    public class SyncUserRequest
    {
        public string Auth0Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public UserType UserType { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string Origin { get; set; } = "signup";
    }
}
