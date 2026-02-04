using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Shared.Contracts.Users.Requests
{
    public class CreateMusicianRequest
    {
        public UserInfoData UserInfo { get; set; } = new();
        public MusicianProfileData MusicianProfile { get; set; } = new();
        public long IdGroup { get; set; }
    }
    public class UserInfoData
    {
        public string Auth0Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public UserType UserType { get; set; }
        public Origin Origin { get; set; }
    }

    public class MusicianProfileData
    {
        public string? ShortBio { get; set; }
        public int YearsExperience { get; set; }
        //public List<int> InstrumentIds { get; set; } = new();
        public bool IsOpenToJoin { get; set; }
    }
}
