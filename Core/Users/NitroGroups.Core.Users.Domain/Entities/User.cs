using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NitroGroups.Core.Users.Domain.Entities
{
    public enum UserType
    {
        Client,
        BandMember,
        Admin
    }
    public class User
    {
        public int Id { get; private set; }
        public string Auth0Id { get; private set; } = null!;
        public string Email { get; private set; } = null!;
        public string FirstName { get; private set; } = null!;
        public string LastName { get; private set; } = null!;
        public string? Phone { get; private set; }
        public UserType UserType { get; private set; } = UserType.Client;
        public string? ProfilePictureUrl { get; private set; }
        public string? LocationText { get; private set; }
        public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; private set; }
        public bool EmailVerified { get; private set; } = false;
        public bool PhoneVerified { get; private set; } = false;
        public bool Active { get; private set; } = true;
    }
}
