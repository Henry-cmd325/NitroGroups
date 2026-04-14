using NitroGroups.Core.Users.Domain.Events;
using NitroGroups.Shared.Domain;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Core.Users.Domain.Entities
{
    public class User : DomainModel
    {
        public string Auth0Id { get; private set; } = null!;
        public string Email { get; private set; } = null!;
        public string FirstName { get; private set; } = null!;
        public string LastName { get; private set; } = null!;
        public string? Phone { get; private set; }
        public UserType UserType { get; private set; } = UserType.Client;
        public string? ProfilePictureUrl { get; private set; }
        public string? LocationText { get; private set; }
        public DateTime? LastLoginAt { get; private set; }
        public bool EmailVerified { get; private set; } = false;
        public bool PhoneVerified { get; private set; } = false;
        public bool Active { get; private set; } = true;
        public DateTime CreatedAt { get; private set; }

        public virtual Musician? Musician { get; private set; }

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

        //Agregar metodo para agregar evento
        public void RaiseSoloMusicianCreatedEvent()
        {
            AddDomainEvent(new UserCreatedDomainEvent(Id, Email, FirstName, LastName, UserType, CreatedAt));
        }

        public void UpdateLastLogin()
        {
            LastLoginAt = DateTime.UtcNow;
        }

        public void UpdateUserType(UserType userType)
        {
            UserType = userType;
        }

        public void UpdateProfilePicture(string profilePictureUrl)
        {
            ProfilePictureUrl = profilePictureUrl;
        }
    }
}
