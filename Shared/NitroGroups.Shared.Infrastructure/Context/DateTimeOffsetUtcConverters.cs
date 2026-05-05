using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace NitroGroups.Shared.Infrastructure.Context;

/// <summary>
/// Npgsql: al escribir <c>timestamp with time zone</c> solo acepta <see cref="DateTimeOffset"/>
/// con offset UTC. Normalizamos en el modelo para no depender de cada handler.
/// </summary>
public static class DateTimeOffsetUtcConverters
{
    public static readonly ValueConverter<DateTimeOffset, DateTimeOffset> TimestampTz = new(
        v => v.ToUniversalTime(),
        v => v);
}
