using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Core.Users.Domain.Events
{
    public class UserCreatedDomainEvent : IDomainEvent
    {
        public Guid EventId { get; }
        public DateTime OccurredAt { get; }
        public string EventType => "UserCreated";

        public int UserId { get; }
        public string Email { get; }
        public string FirstName { get; }
        public string LastName { get; }
        public UserType UserType { get; }
        public DateTime CreatedAt { get; }

        public UserCreatedDomainEvent(int userId, string email, string firstName, string lastName, UserType userType, DateTime createdAt)
        {
            EventId = Guid.NewGuid();
            OccurredAt = DateTime.UtcNow;
            UserId = userId;
            Email = email;
            FirstName = firstName;
            LastName = lastName;
            UserType = userType;
            CreatedAt = createdAt;
        }
    }
}
