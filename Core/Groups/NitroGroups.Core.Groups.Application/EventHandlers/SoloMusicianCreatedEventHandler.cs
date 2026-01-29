using Cortex.Mediator.Notifications;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Application.Events;

namespace NitroGroups.Core.Groups.Application.EventHandlers
{
    public class SoloMusicianCreatedEventHandler(IUnitOfWorkGroups unitOfWork) : INotificationHandler<UsersEvents.SoloMusicianCreatedEvent>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        public Task Handle(UsersEvents.SoloMusicianCreatedEvent notification, CancellationToken cancellationToken)
        {

            return Task.CompletedTask;
        }
    }
}