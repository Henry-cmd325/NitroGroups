using System.Globalization;

namespace NitroGroups.Core.Schedules.Application;

/// <summary>
/// Npgsql requiere UTC al materializar hacia <c>timestamp with time zone</c>
/// (no admite desplazamientos locales como -06:00 en escritura).
/// </summary>
internal static class PostgresDateTime
{
    public static DateTimeOffset ParseIsoToUtc(string s) =>
        DateTimeOffset.Parse(s, null, DateTimeStyles.RoundtripKind).ToUniversalTime();
}
