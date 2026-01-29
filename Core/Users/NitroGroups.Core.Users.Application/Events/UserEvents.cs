using Cortex.Mediator.Notifications;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Core.Users.Application.Events
{
    public class UserEvents
    {
        public class UserCreatedDomainEvent(long userId, string email, string firstName, string lastName, UserType userType, DateTime createdAt) :
            Domain.Events.UserCreatedDomainEvent(userId, email, firstName, lastName, userType, createdAt), INotification { }
    }
}
