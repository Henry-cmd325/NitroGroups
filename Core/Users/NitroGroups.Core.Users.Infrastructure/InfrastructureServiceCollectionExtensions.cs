using Cortex.Mediator.Notifications;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Users.Application.Abstractions;
using NitroGroups.Core.Users.Application.Abstractions.Integrations;
using NitroGroups.Core.Users.Application.EventHandlers;
using NitroGroups.Core.Users.Infrastructure.Adapters;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Core.Users.Application.Events;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Infrastructure.Services;
using NitroGroups.Core.Users.Infrastructure.Configuration;

namespace NitroGroups.Core.Users.Infrastructure
{
    public static class InfrastructureServiceCollectionExtensions
    {
        public static IServiceCollection AddUsersInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<Auth0ManagementApiSettings>(configuration.GetSection("Auth0ManagementApi"));

            services.AddScoped<IGroupIntegrationService, GroupIntegrationMonolith>();

            services.AddScoped<IAuthenticationService, AuthenticationService>();

            services.AddScoped<IUnitOfWorkUser, UnitOfWorkUser>();

            services.AddScoped<INotificationHandler<UserEvents.UserCreatedDomainEvent>, UserCreatedDomainEventHandler>();

            services.AddEndpoints(typeof(InfrastructureServiceCollectionExtensions).Assembly);

            return services;
        }
    }
}