using Cortex.Mediator.Notifications;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Core.Users.Domain.Events;

namespace NitroGroups.Core.Users.Application.EventHandlers
{
    public class UserCreatedDomainEventHandler(ILogger<UserCreatedDomainEventHandler> logger) : INotificationHandler<UserCreatedDomainEvent>
    {
        private readonly ILogger<UserCreatedDomainEventHandler> _logger = logger;

        public async Task Handle(UserCreatedDomainEvent domainEvent, CancellationToken cancellationToken)
        {
            _logger.LogInformation("Processing UserCreated domain event: UserId={UserId}, Email={Email}, Type={UserType}", 
                domainEvent.UserId, domainEvent.Email, domainEvent.UserType);

            
            if (domainEvent.UserType == UserType.BandMember)
            {
                _logger.LogInformation("Band member created, triggering additional profile creation logic for UserId: {UserId}", 
                    domainEvent.UserId);
            }
            
            _logger.LogInformation("UserCreated domain event processed successfully for UserId: {UserId}", 
                domainEvent.UserId);
        }
    }
}

