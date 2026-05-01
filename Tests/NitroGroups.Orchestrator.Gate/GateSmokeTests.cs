using Xunit;

namespace NitroGroups.Orchestrator.Gate;

/// <summary>
/// Cable de humo para el quality gate del orquestador (dotnet test).
/// Añade aquí tests de negocio o de regresión tras generar features.
/// </summary>
public sealed class GateSmokeTests
{
    [Fact]
    public void Gate_project_runs()
    {
        Assert.Equal(1, 1);
    }
}
