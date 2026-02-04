using Cortex.Mediator.Notifications;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Application.Events;
using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;

namespace NitroGroups.Core.Groups.Application.EventHandlers
{
    public class MusicianWithGroupCreatedEventHandler(IUnitOfWorkGroups unitOfWork, ILogger<MusicianWithGroupCreatedEventHandler> logger) : INotificationHandler<UsersEvents.MusicianWithGroupCreatedEvent>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        private readonly ILogger<MusicianWithGroupCreatedEventHandler> _logger = logger;
        public async Task Handle(UsersEvents.MusicianWithGroupCreatedEvent notification, CancellationToken cancellationToken)
        {
            await _unitOfWork.GroupMembers.CreateAsync(new()
            {
                UserId = notification.UserId,
                GroupId = notification.GroupId,
                Role = GroupMemberRole.Member,
                JoinedAt = DateTime.UtcNow,
                IsActive = true,
                JoinedVia = JoinedVia.Invitation
            });

            _logger.LogInformation("Usuario agregado al grupo con id: {0}", notification.GroupId);
        }
    }
}
