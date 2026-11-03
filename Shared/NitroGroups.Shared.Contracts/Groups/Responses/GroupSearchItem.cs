namespace NitroGroups.Shared.Contracts.Groups.Responses
{
    /// <summary>Tarjeta de un grupo en los resultados de búsqueda.</summary>
    public class GroupSearchItem
    {
        public long Id { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string LocationText { get; set; } = string.Empty;
        public string Currency { get; set; } = "MXN";
        public decimal? BasePrice { get; set; }
        public decimal? HourlyRate { get; set; }
        public int MinimumDurationHours { get; set; }
        public int NumMembers { get; set; }
        /// <summary>Portada, foto de perfil o primera foto de la galería, en ese orden.</summary>
        public string? ImageUrl { get; set; }
        public List<string> Genres { get; set; } = [];
        public decimal AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public bool IsVerified { get; set; }
    }
}
