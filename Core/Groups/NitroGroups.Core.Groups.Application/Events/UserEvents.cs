using Cortex.Mediator.Notifications;

namespace NitroGroups.Core.Groups.Application.Events
{
    public class UserEvents
    {
        public class SoloMusicianCreatedEvent(long idUser, string groupName) : 
            Shared.Domain.DomainEvents.Users.SoloMusicianCreatedEvent(idUser, groupName), INotification {}
    }
}
