using AutoMapper;
using Cortex.Mediator.Commands;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;

namespace NitroGroups.Core.Groups.Application.UseCases.Groups.Create
{
    public record CreateGroupCommand(
        long OwnerUserId,
        string Slug,
        string GroupName,
        string Description,
        string Biography,
        int NumMembers,
        int YearsExperience,
        string Phone,
        string Email,
        string LocationText,
        int ServiceRadiusKm,
        string Currency,
        decimal? BasePrice,
        decimal? HourlyRate,
        int MinimumDurationHours,
        int SetupTimeMinutes,
        bool IsAcceptingBookings,
        bool Active) : ICommand<Result<GroupResponse>>;

    public class CreateGroupCommandHandler(IUnitOfWorkGroups unitOfWork, IMapper mapper) : ICommandHandler<CreateGroupCommand, Result<GroupResponse>>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<Result<GroupResponse>> Handle(CreateGroupCommand command, CancellationToken cancellationToken)
        {
            // Check if slug already exists
            var existing = await _unitOfWork.Groups.FindAsync(g => g.Slug == command.Slug);
            if (existing.Any())
                return "Ya existe un grupo con este nombre/slug.";

            // Map command to entity
            var group = _mapper.Map<Group>(command);
            group.AverageRating = 0;
            group.TotalReviews = 0;
            group.ViewCount = 0;
            group.BookingCount = 0;
            group.IsVerified = false;
            group.IsFeatured = false;

            await _unitOfWork.Groups.CreateAsync(group);

            // Add the owner as leader member
            var ownerMember = new GroupMember
            {
                GroupId = group.Id,
                UserId = command.OwnerUserId,
                Role = GroupMemberRole.Leader,
                IsActive = true,
                JoinedAt = DateTime.UtcNow,
                JoinedVia = JoinedVia.Manual
            };
            await _unitOfWork.GroupMembers.CreateAsync(ownerMember);

            await _unitOfWork.CompleteAsync();

            return _mapper.Map<GroupResponse>(group);
        }
    }
}
