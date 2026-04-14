namespace NitroGroups.Shared.Contracts.Groups.Requests
{
    public class UpdateGroupRequest
    {
        public string Slug { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Biography { get; set; } = string.Empty;
        public int NumMembers { get; set; }
        public int YearsExperience { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LocationText { get; set; } = string.Empty;
        public int ServiceRadiusKm { get; set; }
        public string Currency { get; set; } = string.Empty;
        public decimal? BasePrice { get; set; }
        public decimal? HourlyRate { get; set; }
        public int MinimumDurationHours { get; set; }
        public int SetupTimeMinutes { get; set; }
        public bool IsAcceptingBookings { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? CoverImageUrl { get; set; }
    }
}
