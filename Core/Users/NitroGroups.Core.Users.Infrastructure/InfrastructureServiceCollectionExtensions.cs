using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Infrastructure.Services;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Core.Users.Application.Handlers;
using NitroGroups.Core.Users.Domain.Events;

namespace NitroGroups.Core.Users.Infrastructure
{
    public static class InfrastructureServiceCollectionExtensions
    { 
        public static IServiceCollection AddUsersInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<IUserService, UserService>();
            
            // Registrar Domain Event Dispatcher
            services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
            
            // Registrar Domain Event Handlers
            services.AddScoped<IDomainEventHandler<UserCreatedDomainEvent>, UserCreatedDomainEventHandler>();
            
            // Registrar Outbox Service
            services.AddScoped<IOutboxService, OutboxService>();
            
            // Registrar Background Service para procesar eventos
            services.AddHostedService<OutboxProcessor>();

            services.AddEndpoints(typeof(InfrastructureServiceCollectionExtensions).Assembly);

            return services;
        }
    }
}
