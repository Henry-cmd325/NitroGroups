namespace NitroGroups.Shared.Contracts.Users.Responses
{
    public class MusicianDto
    {
        public long Id { get; set; }
        public long UserId { get; set; }
        public int YearsExperience { get; set; }
        public string? ShortBio { get; set; }
        public bool IsOpenToJoin { get; set; }
    }
}
