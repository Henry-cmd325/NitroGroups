using Cortex.Mediator.Notifications;
using Microsoft.Extensions.Logging;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Application.Events;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;

namespace NitroGroups.Core.Groups.Application.EventHandlers
{
    public class SoloMusicianCreatedEventHandler(
        IUnitOfWorkGroups unitOfWork,
        ILogger<SoloMusicianCreatedEventHandler> logger) : INotificationHandler<UsersEvents.SoloMusicianCreatedEvent>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        private readonly ILogger<SoloMusicianCreatedEventHandler> _logger = logger;

        public async Task Handle(UsersEvents.SoloMusicianCreatedEvent notification, CancellationToken cancellationToken)
        {
            var slug = notification.Name
                .ToLowerInvariant()
                .Replace(" ", "-")
                .Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u")
                .Replace("ñ", "n");

            var existingGroups = await _unitOfWork.Groups.FindAsync(g => g.Slug == slug);
            if (existingGroups.Any())
            {
                slug = $"{slug}-{DateTime.UtcNow.Ticks % 10000}";
            }

            var group = new Group
            {
                OwnerUserId = notification.IdUser,
                Slug = slug,
                GroupName = notification.Name,
                Description = string.Empty,
                Biography = string.Empty,
                NumMembers = 1,
                YearsExperience = 0,
                Phone = string.Empty,
                Email = string.Empty,
                LocationText = string.Empty,
                ServiceRadiusKm = 50,
                Currency = "MXN",
                MinimumDurationHours = 2,
                SetupTimeMinutes = 30,
                AverageRating = 0,
                TotalReviews = 0,
                ViewCount = 0,
                BookingCount = 0,
                IsVerified = false,
                IsFeatured = false,
                IsAcceptingBookings = true,
                Active = true
            };

            await _unitOfWork.Groups.CreateAsync(group);
            await _unitOfWork.CompleteAsync();

            var ownerMember = new GroupMember
            {
                GroupId = group.Id,
                UserId = notification.IdUser,
                Role = GroupMemberRole.Leader,
                IsActive = true,
                JoinedAt = DateTime.UtcNow,
                JoinedVia = JoinedVia.Manual
            };
            await _unitOfWork.GroupMembers.CreateAsync(ownerMember);

            await _unitOfWork.CompleteAsync();

            _logger.LogInformation(
                "Grupo solista '{GroupName}' (slug: {Slug}) creado para usuario {UserId}",
                group.GroupName, group.Slug, notification.IdUser);
        }
    }
}