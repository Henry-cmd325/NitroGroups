using NitroGroups.Shared.Abstractions.Events;

namespace NitroGroups.Core.Users.Domain.Entities
{
    public enum UserType
    {
        Client,
        BandMember,
        Admin
    }
    public class User
    {
        public int Id { get; private set; }
        public string Auth0Id { get; private set; } = null!;
        public string Email { get; private set; } = null!;
        public string FirstName { get; private set; } = null!;
        public string LastName { get; private set; } = null!;
        public string? Phone { get; private set; }
        public UserType UserType { get; private set; } = UserType.Client;
        public string? ProfilePictureUrl { get; private set; }
        public string? LocationText { get; private set; }
        public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; private set; }
        public bool EmailVerified { get; private set; } = false;
        public bool PhoneVerified { get; private set; } = false;
        public bool Active { get; private set; } = true;

        // Domain Events
        private readonly List<IDomainEvent> _domainEvents = new();
        public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

        // Constructor para Entity Framework
        private User() { }

        // Constructor para crear usuarios
        public User(string auth0Id, string email, string firstName, string lastName, UserType userType = UserType.Client)
        {
            Auth0Id = auth0Id;
            Email = email;
            FirstName = firstName;
            LastName = lastName;
            UserType = userType;
            CreatedAt = DateTime.UtcNow;
            Active = true;
        }

        // Métodos para manejar Domain Events
        protected void AddDomainEvent(IDomainEvent domainEvent)
        {
            _domainEvents.Add(domainEvent);
        }

        public void ClearDomainEvents()
        {
            _domainEvents.Clear();
        }

        // Método para disparar evento después de que se asigne el ID
        public void RaiseUserCreatedEvent()
        {
            AddDomainEvent(new Events.UserCreatedDomainEvent(
                Id, Email, FirstName, LastName, UserType, CreatedAt));
        }
    }
}
