namespace NitroGroups.Shared.Contracts.Groups;

public class MusicGroup
{
    public int Id { get; set; }
    public int OwnerUserId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Biography { get; set; }
    public int NumMembers { get; set; } = 1;
    public int YearsExperience { get; set; } = 0;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? LocationText { get; set; }
    public int ServiceRadiusKm { get; set; } = 50;
    public string Currency { get; set; } = "MXN";
    public decimal? BasePrice { get; set; }
    public decimal? HourlyRate { get; set; }
    public int MinimumDurationHours { get; set; } = 2;
    public int SetupTimeMinutes { get; set; } = 30;
    public decimal AverageRating { get; set; } = 0;
    public int TotalReviews { get; set; } = 0;
    public int ViewCount { get; set; } = 0;
    public int BookingCount { get; set; } = 0;
    public bool IsVerified { get; set; } = false;
    public bool IsFeatured { get; set; } = false;
    public bool IsAcceptingBookings { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool Active { get; set; } = true;
}
