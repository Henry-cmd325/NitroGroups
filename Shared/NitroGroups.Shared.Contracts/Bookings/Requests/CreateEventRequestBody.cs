namespace NitroGroups.Shared.Contracts.Bookings.Requests
{
    /// <summary>
    /// Cuerpo de <c>POST api/event-requests</c>. El cliente siempre es el usuario del token:
    /// no hay campo de usuario y cualquier "userId" que se envíe se ignora.
    /// </summary>
    public class CreateEventRequestBody
    {
        public long GroupId { get; set; }
        public DateOnly EventDate { get; set; }
        public TimeOnly? StartTime { get; set; }
        public int DurationHours { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string LocationText { get; set; } = string.Empty;
        public int? GuestCount { get; set; }
        public decimal? Budget { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>Cuerpo opcional de aceptar o rechazar una solicitud.</summary>
    public class RespondEventRequestBody
    {
        public string? Message { get; set; }
    }

    /// <summary>Cuerpo de <c>POST api/event-requests/{id}/messages</c>.</summary>
    public class PostEventRequestMessageBody
    {
        public string Body { get; set; } = string.Empty;
    }
}
