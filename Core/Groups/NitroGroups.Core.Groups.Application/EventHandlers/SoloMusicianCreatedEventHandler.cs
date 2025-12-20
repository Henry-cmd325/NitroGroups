using Cortex.Mediator.Notifications;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Groups.Application.Events;

namespace NitroGroups.Core.Groups.Application.EventHandlers
{
    public class SoloMusicianCreatedEventHandler(ILogger<SoloMusicianCreatedEventHandler> logger) : INotificationHandler<UserEvents.SoloMusicianCreatedEvent>
    {
        public Task Handle(UserEvents.SoloMusicianCreatedEvent notification, CancellationToken cancellationToken)
        {
            logger.LogInformation("Handle de SoloMusicianCreatedEventHandler");

            return Task.CompletedTask;
        }
    }
}
