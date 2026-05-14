using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Shared.Infrastructure.Context;
using System.Reflection;

namespace NitroGroups.Tests.Integration.Architecture;

public class ApplicationArchitectureTests
{
    private static readonly Assembly[] ApplicationAssemblies =
    [
        typeof(Core.Users.Application.DependencyInjection).Assembly,
        typeof(Core.Groups.Application.DependencyInjection).Assembly,
        typeof(Core.Schedules.Application.DependencyInjection).Assembly
    ];

    [Fact]
    public void ApplicationProjects_ShouldNotReferenceInfrastructureProjects()
    {
        var forbiddenReferences = new[]
        {
            "NitroGroups.Shared.Infrastructure",
            "NitroGroups.Core.Users.Infrastructure",
            "NitroGroups.Core.Groups.Infrastructure",
            "NitroGroups.Core.Schedules.Infrastructure"
        };

        var violations = ApplicationAssemblies
            .SelectMany(assembly => assembly.GetReferencedAssemblies()
                .Where(reference => forbiddenReferences.Contains(reference.Name))
                .Select(reference => $"{assembly.GetName().Name} -> {reference.Name}"))
            .ToList();

        Assert.True(violations.Count == 0,
            "Application no debe referenciar proyectos de Infrastructure. Violaciones: " + string.Join(", ", violations));
    }

    [Fact]
    public void UseCaseHandlers_ShouldDependOnModuleUnitOfWork_AndNotOnDbContextOrDirectRepositories()
    {
        var allowedUnitOfWorkTypes = new HashSet<Type>
        {
            typeof(IUnitOfWorkUser),
            typeof(IUnitOfWorkGroups),
            typeof(IUnitOfWorkSchedules)
        };

        var forbiddenParameterTypes = new HashSet<Type>
        {
            typeof(NitroGroupsContext),
            typeof(IGroupAvailabilityRepository),
            typeof(IBusyScheduleRepository)
        };

        var handlerTypes = ApplicationAssemblies
            .SelectMany(assembly => assembly.GetTypes())
            .Where(type => type.IsClass
                && !type.IsAbstract
                && type.Namespace?.Contains(".UseCases.", StringComparison.Ordinal) == true
                && type.Name.EndsWith("Handler", StringComparison.Ordinal))
            .ToList();

        var violations = new List<string>();

        foreach (var handlerType in handlerTypes)
        {
            var constructor = handlerType.GetConstructors(BindingFlags.Public | BindingFlags.Instance)
                .OrderByDescending(ctor => ctor.GetParameters().Length)
                .FirstOrDefault();

            if (constructor is null)
            {
                continue;
            }

            var parameters = constructor.GetParameters();

            if (parameters.Any(parameter => forbiddenParameterTypes.Contains(parameter.ParameterType)))
            {
                violations.Add($"{handlerType.FullName} usa dependencias prohibidas: {string.Join(", ", parameters.Where(p => forbiddenParameterTypes.Contains(p.ParameterType)).Select(p => p.ParameterType.Name))}");
                continue;
            }

            if (!parameters.Any(parameter => allowedUnitOfWorkTypes.Contains(parameter.ParameterType)))
            {
                violations.Add($"{handlerType.FullName} no depende de su UnitOfWork.");
            }
        }

        Assert.True(violations.Count == 0,
            "Se encontraron violaciones de arquitectura en UseCases: " + string.Join(" | ", violations));
    }
}
