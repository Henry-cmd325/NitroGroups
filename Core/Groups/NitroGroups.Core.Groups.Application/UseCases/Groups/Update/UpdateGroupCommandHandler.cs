using AutoMapper;
using Cortex.Mediator.Commands;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;

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
        bool IsAcceptingBookings,
        string? ProfilePictureUrl,
        string? CoverImageUrl) : ICommand<Result<GroupResponse>>;

    public class UpdateGroupCommandHandler(IUnitOfWorkGroups unitOfWork, IMapper mapper) : ICommandHandler<UpdateGroupCommand, Result<GroupResponse>>
    {
        private readonly IUnitOfWorkGroups _unitOfWork = unitOfWork;
        private readonly IMapper _mapper = mapper;

        public async Task<Result<GroupResponse>> Handle(UpdateGroupCommand command, CancellationToken cancellationToken)
        {
            var group = await _unitOfWork.Groups.GetByIdAsync(command.Id);

            if (group == null)
                return "Group not found.";

            _mapper.Map(command, group);

            _unitOfWork.Groups.Update(group);
            await _unitOfWork.CompleteAsync();

            // Recargar con includes para devolver genres y media
            var updatedGroups = await _unitOfWork.Groups.FindWithIncludesAsync(
                g => g.Id == command.Id,
                g => g.Genres,
                g => g.Media);
            var updatedGroup = updatedGroups.FirstOrDefault() ?? group;

            return _mapper.Map<GroupResponse>(updatedGroup);
        }
    }
}