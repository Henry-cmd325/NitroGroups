using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Update;

public class UpdateAvailabilityCommandHandler(IUnitOfWorkSchedules unitOfWork) 
    : ICommandHandler<UpdateAvailabilityCommand, Result<ScheduleEventDto>>
{
    public async Task<Result<ScheduleEventDto>> Handle(UpdateAvailabilityCommand request, CancellationToken cancellationToken)
    {
        var availability = await unitOfWork.AvailabilityRepository.GetByIdAsync(request.AvailabilityId);
        
        if (availability is null || availability.GroupId != request.GroupId)
        {
            return "Availability not found or does not belong to the group.";
        }

        availability.StartAt = request.Start.ToUniversalTime();
        availability.EndAt = request.End.ToUniversalTime();
        
        if (request.Available.HasValue) availability.Available = request.Available.Value;
        if (request.CustomPrice.HasValue) availability.CustomPrice = request.CustomPrice;
        if (request.Note is not null) availability.Note = request.Note;

        unitOfWork.AvailabilityRepository.Update(availability);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = new ScheduleEventDto
        {
            Id = $"avail_{availability.Id}",
            OriginalEntityId = availability.Id,
            Title = availability.Available ? "Disponible" : "Bloqueado",
            Start = availability.StartAt,
            End = availability.EndAt,
            IsAvailable = availability.Available,
            BackgroundColor = availability.Available ? "#34d399" : "#e2e8f0",
            BorderColor = availability.Available ? "#34d399" : "#cbd5e1",
            TextColor = "#0f172a"
        };

        return Result<ScheduleEventDto>.Success(dto);
    }
}
