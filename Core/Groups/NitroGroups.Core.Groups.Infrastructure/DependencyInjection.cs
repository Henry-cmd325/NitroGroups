using Cortex.Mediator.Notifications;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Application.EventHandlers;
using NitroGroups.Core.Groups.Application.Events;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Groups.Infrastructure
{
    public static class DependencyInjection
    { 
        public static IServiceCollection AddGroupsInfrastructure(this IServiceCollection services)
        {   
            services.AddScoped<IUnitOfWorkGroups, UnitOfWorkGroups>();
            
            services.AddScoped<INotificationHandler<UsersEvents.SoloMusicianCreatedEvent>, SoloMusicianCreatedEventHandler>();

            services.AddEndpoints(typeof(DependencyInjection).Assembly);

            return services;
        }
    }
}