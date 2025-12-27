using Cortex.Mediator.Notifications;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Application.Abstractions.Integrations;
using NitroGroups.Core.Users.Application.EventHandlers;
using NitroGroups.Core.Users.Infrastructure.Adapters;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Core.Users.Application.Events;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Infrastructure.Services;

namespace NitroGroups.Core.Users.Infrastructure
{
    public static class InfrastructureServiceCollectionExtensions
    { 
        public static IServiceCollection AddUsersInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<IGroupIntegrationService, GroupIntegrationMonolith>();

            services.AddScoped<IAuthenticationService, AuthenticationService>();
            
            services.AddScoped<IUnitOfWorkUser, UnitOfWorkUser>();
            
            services.AddScoped<INotificationHandler<UserEvents.UserCreatedDomainEvent>, UserCreatedDomainEventHandler>();

            services.AddEndpoints(typeof(InfrastructureServiceCollectionExtensions).Assembly);

            return services;
        }
    }
}