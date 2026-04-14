namespace NitroGroups.Shared.Contracts.Groups.Responses
{
    public class GroupResponse
    {
        public long Id { get; set; }
        public long OwnerUserId { get; set; }
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
        public decimal AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int ViewCount { get; set; }
        public int BookingCount { get; set; }
        public bool IsVerified { get; set; }
        public bool IsFeatured { get; set; }
        public bool IsAcceptingBookings { get; set; }
        public bool Active { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? CoverImageUrl { get; set; }

        public List<GenreResponse> Genres { get; set; } = [];
        public List<GroupMediaResponse> Media { get; set; } = [];
    }
}
