using Cortex.Mediator.Notifications;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Application.EventHandlers;
using NitroGroups.Core.Users.Domain.Events;
using NitroGroups.Shared.EndpointMapping;

namespace NitroGroups.Core.Users.Infrastructure
{
    public static class InfrastructureServiceCollectionExtensions
    { 
        public static IServiceCollection AddUsersInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<IUnitOfWorkUser, UnitOfWork>();
            
            services.AddScoped<INotificationHandler<UserCreatedDomainEvent>, UserCreatedDomainEventHandler>();

            services.AddEndpoints(typeof(InfrastructureServiceCollectionExtensions).Assembly);

            return services;
        }
    }
}