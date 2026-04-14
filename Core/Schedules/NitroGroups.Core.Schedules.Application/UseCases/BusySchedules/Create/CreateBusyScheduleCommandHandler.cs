using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Create;

public class CreateBusyScheduleCommandHandler(IUnitOfWorkSchedules unitOfWork) 
    : ICommandHandler<CreateBusyScheduleCommand, Result<ScheduleEventDto>>
{
    public async Task<Result<ScheduleEventDto>> Handle(CreateBusyScheduleCommand request, CancellationToken cancellationToken)
    {
        var busySchedule = new BusySchedule
        {
            GroupId = request.GroupId,
            Title = request.Title,
            StartAt = request.Start.ToUniversalTime(),
            EndAt = request.End.ToUniversalTime(),
            Source = request.Source
        };

        await unitOfWork.BusyScheduleRepository.CreateAsync(busySchedule);
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
