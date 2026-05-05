using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Update;

public class UpdateBusyScheduleCommandHandler(IUnitOfWorkSchedules unitOfWork) 
    : ICommandHandler<UpdateBusyScheduleCommand, Result<ScheduleEventDto>>
{
    public async Task<Result<ScheduleEventDto>> Handle(UpdateBusyScheduleCommand request, CancellationToken cancellationToken)
    {
        var busySchedule = await unitOfWork.BusyScheduleRepository.GetByIdAsync(request.BusyScheduleId);
        
        if (busySchedule is null || busySchedule.GroupId != request.GroupId)
        {
            return "Busy Schedule not found or does not belong to the group.";
        }

        busySchedule.StartAt = request.Start.ToUniversalTime();
        busySchedule.EndAt = request.End.ToUniversalTime();

        if (request.Title is not null) busySchedule.Title = request.Title;
        if (request.Source.HasValue) busySchedule.Source = request.Source.Value;

        unitOfWork.BusyScheduleRepository.Update(busySchedule);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        var dto = new ScheduleEventDto
        {
            Id = $"busy_{busySchedule.Id}",
            OriginalEntityId = busySchedule.Id,
            Title = busySchedule.Title ?? busySchedule.Source.ToString(),
            Start = busySchedule.StartAt,
            End = busySchedule.EndAt,
            IsAvailable = false,
            BackgroundColor = "#fb7185",
            BorderColor = "#fb7185",
            TextColor = "#0f172a"
        };

        return Result<ScheduleEventDto>.Success(dto);
    }
}
