using Npgsql;

namespace NitroGroups.Tests.Integration.Infrastructure;

/// <summary>Base de datos desechable en el servidor de NITRO_TEST_POSTGRES; se borra al hacer Dispose.</summary>
public sealed class PostgresTestDatabase : IAsyncDisposable
{
    private readonly string _admin;
    public string ConnectionString { get; }
    private readonly string _name;

    private PostgresTestDatabase(string admin, string name)
    {
        _admin = admin;
        _name = name;
        ConnectionString = new NpgsqlConnectionStringBuilder(admin) { Database = name, Pooling = false }.ConnectionString;
    }

    public static async Task<PostgresTestDatabase> CreateAsync()
    {
        var admin = Environment.GetEnvironmentVariable(PostgresFactAttribute.Variable)!;
        var name = $"nitro_test_{Guid.NewGuid():N}";
        await using var conn = new NpgsqlConnection(admin);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand($"CREATE DATABASE \"{name}\"", conn);
        await cmd.ExecuteNonQueryAsync();
        return new PostgresTestDatabase(admin, name);
    }

    public async ValueTask DisposeAsync()
    {
        NpgsqlConnection.ClearAllPools();
        await using var conn = new NpgsqlConnection(_admin);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{_name}\" WITH (FORCE)", conn);
        await cmd.ExecuteNonQueryAsync();
    }
}
