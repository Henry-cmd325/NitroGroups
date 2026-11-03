using System.Reflection;
using System.Xml.Linq;

namespace NitroGroups.Tests.Integration.Architecture;

/// <summary>
/// Reglas del monolito modular:
/// 1. Un módulo nunca referencia a otro módulo (solo a Shared.*). Se comunican por
///    <c>Shared.Contracts.Modules</c> o por eventos de integración.
/// 2. Shared.* nunca referencia a Core.*.
/// 3. Domain no depende de Application, Infrastructure ni de EF Core.
/// Se valida a nivel de ensamblado compilado y a nivel de .csproj (para atrapar
/// referencias aunque todavía no se usen en código).
/// </summary>
public class ModuleBoundariesTests
{
    private static readonly string[] Modules = ["Users", "Groups", "Schedules"];

    private static readonly Assembly[] CoreAssemblies =
    [
        typeof(Core.Users.Domain.Entities.User).Assembly,
        typeof(Core.Users.Application.DependencyInjection).Assembly,
        typeof(Core.Users.Infrastructure.DependencyInjection).Assembly,
        typeof(Core.Groups.Domain.Entities.Group).Assembly,
        typeof(Core.Groups.Application.DependencyInjection).Assembly,
        typeof(Core.Groups.Infrastructure.DependencyInjection).Assembly,
        typeof(Core.Schedules.Domain.Entities.BusySchedule).Assembly,
        typeof(Core.Schedules.Application.DependencyInjection).Assembly,
        typeof(Core.Schedules.Infrastructure.DependencyInjection).Assembly,
    ];

    private static readonly Assembly[] SharedAssemblies =
    [
        typeof(Shared.Domain.DomainModel).Assembly,
        typeof(Shared.Contracts.Modules.IUsersModuleApi).Assembly,
        typeof(Shared.Abstractions.Repository.IUnitOfWork).Assembly,
        typeof(Shared.Infrastructure.DependencyInjection).Assembly,
        typeof(Shared.EndpointMapping.IEndpoint).Assembly,
    ];

    [Fact]
    public void Modules_ShouldNotReferenceOtherModules_InCompiledAssemblies()
    {
        var violations = CoreAssemblies
            .SelectMany(assembly =>
            {
                var owner = ModuleOf(assembly.GetName().Name!);
                return assembly.GetReferencedAssemblies()
                    .Select(r => r.Name!)
                    .Where(r => ModuleOf(r) is { } other && other != owner)
                    .Select(r => $"{assembly.GetName().Name} -> {r}");
            })
            .ToList();

        Assert.True(violations.Count == 0, "Un módulo referencia a otro: " + string.Join(", ", violations));
    }

    [Fact]
    public void SharedProjects_ShouldNotReferenceCore()
    {
        var violations = SharedAssemblies
            .SelectMany(assembly => assembly.GetReferencedAssemblies()
                .Where(r => r.Name!.StartsWith("NitroGroups.Core.", StringComparison.Ordinal))
                .Select(r => $"{assembly.GetName().Name} -> {r.Name}"))
            .ToList();

        Assert.True(violations.Count == 0, "Shared depende de Core: " + string.Join(", ", violations));
    }

    [Fact]
    public void DomainProjects_ShouldNotDependOnApplicationInfrastructureOrEfCore()
    {
        var violations = CoreAssemblies
            .Where(a => a.GetName().Name!.EndsWith(".Domain", StringComparison.Ordinal))
            .SelectMany(assembly => assembly.GetReferencedAssemblies()
                .Where(r => r.Name!.EndsWith(".Application", StringComparison.Ordinal)
                    || r.Name!.EndsWith(".Infrastructure", StringComparison.Ordinal)
                    || r.Name!.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal))
                .Select(r => $"{assembly.GetName().Name} -> {r.Name}"))
            .ToList();

        Assert.True(violations.Count == 0, "Domain tiene dependencias prohibidas: " + string.Join(", ", violations));
    }

    [Fact]
    public void ProjectFiles_ShouldRespectModuleBoundaries()
    {
        var root = FindRepositoryRoot();
        var violations = new List<string>();

        foreach (var csproj in Directory.EnumerateFiles(Path.Combine(root, "Core"), "*.csproj", SearchOption.AllDirectories)
                     .Concat(Directory.EnumerateFiles(Path.Combine(root, "Shared"), "*.csproj", SearchOption.AllDirectories)))
        {
            var project = Path.GetFileNameWithoutExtension(csproj);
            if (project == "NitroGroups.Core.Bootstrap")
                continue; // Composition root: es el único que conoce a todos los módulos.

            var owner = ModuleOf(project);
            var isShared = project.StartsWith("NitroGroups.Shared.", StringComparison.Ordinal);

            var references = XDocument.Load(csproj)
                .Descendants("ProjectReference")
                .Select(e => Path.GetFileNameWithoutExtension(e.Attribute("Include")!.Value.Replace('\\', '/')));

            foreach (var reference in references)
            {
                var target = ModuleOf(reference);
                if (isShared && reference.StartsWith("NitroGroups.Core.", StringComparison.Ordinal))
                    violations.Add($"{project} -> {reference}");
                else if (target is not null && owner is not null && target != owner)
                    violations.Add($"{project} -> {reference}");
            }
        }

        Assert.True(violations.Count == 0, "Referencias de proyecto que cruzan fronteras: " + string.Join(", ", violations));
    }

    private static string? ModuleOf(string assemblyName) =>
        Modules.FirstOrDefault(m => assemblyName.StartsWith($"NitroGroups.Core.{m}.", StringComparison.Ordinal));

    private static string FindRepositoryRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "NitroGroups.slnx")))
            dir = dir.Parent;

        return dir?.FullName ?? throw new InvalidOperationException("No se encontró NitroGroups.slnx subiendo desde " + AppContext.BaseDirectory);
    }
}
