namespace NitroGroups.Core.Bookings.Application;

/// <summary>
/// Las fechas de evento se interpretan en hora de México (misma regla que la búsqueda de
/// Groups; se copia aquí para no depender de otro módulo). Si el host no trae tzdata se usa
/// UTC-6, la hora del centro de México todo el año desde que se eliminó el horario de verano.
/// </summary>
public static class MexicoTime
{
    private static readonly Lazy<TimeZoneInfo> Zone = new(() =>
        TimeZoneInfo.TryFindSystemTimeZoneById("America/Mexico_City", out var tz)
            ? tz
            : TimeZoneInfo.CreateCustomTimeZone("Mexico/Central", TimeSpan.FromHours(-6), "Mexico Central", "Mexico Central"));

    /// <summary>[00:00, 24:00) del día en hora de México, como instantes absolutos.</summary>
    public static (DateTimeOffset From, DateTimeOffset To) LocalDay(DateOnly date)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = date.AddDays(1).ToDateTime(TimeOnly.MinValue);
        return (new DateTimeOffset(start, Zone.Value.GetUtcOffset(start)),
                new DateTimeOffset(end, Zone.Value.GetUtcOffset(end)));
    }

    /// <summary>La fecha de hoy en México.</summary>
    public static DateOnly Today(TimeProvider time)
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(time.GetUtcNow(), Zone.Value).DateTime);
}
