using Cortex.Mediator.Notifications;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Application.Events;
using NitroGroups.Core.Groups.Domain.Entities;

namespace NitroGroups.Core.Groups.Application.EventHandlers
{
    public class SoloMusicianCreatedEventHandler(IUnitOfWorkGroups unitOfWork) : INotificationHandler<UserEvents.SoloMusicianCreatedEvent>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        public Task Handle(UserEvents.SoloMusicianCreatedEvent notification, CancellationToken cancellationToken)
        {

            return Task.CompletedTask;
        }
    }
}
