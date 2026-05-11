using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Infrastructure.Repositories;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Schedules.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddSchedulesInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<IGroupAvailabilityRepository, GroupAvailabilityRepository>();
        services.AddScoped<IBusyScheduleRepository, BusyScheduleRepository>();
        services.AddScoped<IUnitOfWorkSchedules, UnitOfWorkSchedules>();

        services.AddEndpoints(typeof(DependencyInjection).Assembly);
        
        return services;
    }
}
