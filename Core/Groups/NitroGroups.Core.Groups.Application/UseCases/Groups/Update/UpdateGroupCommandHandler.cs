using AutoMapper;
using Cortex.Mediator.Commands;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Groups.Application.UseCases.Groups.Update
{
    public record UpdateGroupCommand(
        long Id,
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
        decimal AverageRating,
        int TotalReviews,
        int ViewCount, 
        int BookingCount,
        bool IsVerified,
        bool IsFeatured,
        bool IsAcceptingBookings,
        bool Active) : ICommand<Result<bool>>;

    public class UpdateGroupCommandHandler(IUnitOfWorkGroups unitOfWork, IMapper mapper) : ICommandHandler<UpdateGroupCommand, Result<bool>>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<Result<bool>> Handle(UpdateGroupCommand command, CancellationToken cancellationToken)
        {
            var group = await _unitOfWork.Groups.GetByIdAsync(command.Id);

            if (group == null)
                return "Group not found.";

            _mapper.Map(command, group);

            _unitOfWork.Groups.Update(group);
            await _unitOfWork.CompleteAsync();

            return true;
        }
    }
}