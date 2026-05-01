namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Create;

/// <summary>Solo cuerpo JSON; groupId y cabecera Idempotency-Key vienen por ruta/headers.</summary>
public sealed class CreateBlockBody
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string StartAt { get; set; } = string.Empty;
    public string EndAt { get; set; } = string.Empty;
}
