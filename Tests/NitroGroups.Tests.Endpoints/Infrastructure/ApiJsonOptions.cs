using System.Text.Json;
using System.Text.Json.Serialization;

namespace NitroGroups.Tests.Endpoints.Infrastructure;

/// <summary>
/// Opciones de JSON compartidas para deserializar respuestas de la API,
/// alineadas con la configuración de la API (enums como strings, camelCase).
/// </summary>
public static class ApiJsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() }
    };
}
