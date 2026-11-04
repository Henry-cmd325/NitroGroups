using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Infrastructure.Persistence;
using NitroGroups.Core.Schedules.Infrastructure.Repositories;
using NitroGroups.Shared.Contracts.Modules;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.Infrastructure.Persistence;

namespace NitroGroups.Core.Schedules.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddSchedulesInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddModuleDbContext<SchedulesDbContext>(configuration, SchedulesDbContext.SchemaName);
        services.AddSchedulesRepositories();
        services.AddScoped<ISchedulesModuleApi, Adapters.SchedulesModuleApi>();

        services.AddEndpoints(typeof(DependencyInjection).Assembly);

        return services;
    }

    /// <summary>Repositorios y UnitOfWork del módulo (sin DbContext; útil para tests).</summary>
    public static IServiceCollection AddSchedulesRepositories(this IServiceCollection services)
    {
        services.AddScoped<IGroupAvailabilityRepository, GroupAvailabilityRepository>();
        services.AddScoped<IBusyScheduleRepository, BusyScheduleRepository>();
        services.AddScoped<IUnitOfWorkSchedules, UnitOfWorkSchedules>();
        return services;
    }
}
