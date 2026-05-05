namespace NitroGroups.Shared.Contracts.Groups.Requests
{
    public class CreateGroupRequest
    {
        public long OwnerUserId { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Biography { get; set; } = string.Empty;
        public int NumMembers { get; set; } = 1;
        public int YearsExperience { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LocationText { get; set; } = string.Empty;
        public int ServiceRadiusKm { get; set; } = 50;
        public string Currency { get; set; } = "MXN";
        public decimal? BasePrice { get; set; }
        public decimal? HourlyRate { get; set; }
        public int MinimumDurationHours { get; set; } = 2;
        public int SetupTimeMinutes { get; set; } = 30;
        public bool IsAcceptingBookings { get; set; } = true;
        public bool Active { get; set; } = true;
    }
}
