namespace NitroGroups.Tests.Integration.Infrastructure;

/// <summary>
/// Test que necesita PostgreSQL real (concurrencia, SQL que InMemory no reproduce). Corre si
/// existe NITRO_TEST_POSTGRES (cadena de conexión a un servidor; el test crea y borra su base).
/// En CI siempre está definida; en local se salta con un motivo visible si falta.
/// </summary>
public sealed class PostgresFactAttribute : FactAttribute
{
    public const string Variable = "NITRO_TEST_POSTGRES";

    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(Variable)))
            Skip = $"Requiere PostgreSQL: define {Variable} (p. ej. Host=localhost;Username=postgres;Password=postgres).";
    }
}
