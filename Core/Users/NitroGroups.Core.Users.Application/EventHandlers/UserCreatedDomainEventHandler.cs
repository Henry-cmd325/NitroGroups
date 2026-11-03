using Cortex.Mediator.Notifications;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Users.Application.Events;

namespace NitroGroups.Core.Users.Application.EventHandlers
{
    public class UserCreatedDomainEventHandler(ILogger<UserCreatedDomainEventHandler> logger) : INotificationHandler<UserEvents.UserCreatedDomainEvent>
    {
        private readonly ILogger<UserCreatedDomainEventHandler> _logger = logger;

        public Task Handle(UserEvents.UserCreatedDomainEvent domainEvent, CancellationToken cancellationToken)
        {
            _logger.LogInformation("Processing UserCreated domain event: UserId={UserId}, Email={Email}, Type={UserType}", 
                domainEvent.UserId, domainEvent.Email, domainEvent.UserType);

            _logger.LogInformation("UserCreated domain event processed successfully for UserId: {UserId}", 
                domainEvent.UserId);

            return Task.CompletedTask;
        }
    }
}

