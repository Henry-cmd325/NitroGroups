using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Core.Users.Domain.Events
{
    public class UserCreatedDomainEvent(long userId, string email, string firstName, string lastName, UserType userType, DateTime createdAt) : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public string EventType => nameof(UserCreatedDomainEvent);

        public long UserId { get; } = userId;
        public string Email { get; } = email;
        public string FirstName { get; } = firstName;
        public string LastName { get; } = lastName;
        public UserType UserType { get; } = userType;
        public DateTime CreatedAt { get; } = createdAt;
    }
}
