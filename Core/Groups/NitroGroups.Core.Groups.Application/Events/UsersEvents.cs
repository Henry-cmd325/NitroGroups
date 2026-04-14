using Cortex.Mediator.Notifications;

namespace NitroGroups.Core.Groups.Application.Events
{
    public class UsersEvents
    {
        public class SoloMusicianCreatedEvent(long idUser, string name) : 
            Shared.Domain.DomainEvents.Users.SoloMusicianCreatedEvent(idUser, name), INotification {}

        public class MusicianWithGroupCreatedEvent(long idUser, long groupId) :
            Shared.Domain.DomainEvents.Users.MusicianWithGroupCreatedEvent(idUser, groupId), INotification {}
    }
}
