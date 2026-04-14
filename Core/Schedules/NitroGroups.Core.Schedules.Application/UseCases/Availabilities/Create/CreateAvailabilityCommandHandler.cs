using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Create;

public class CreateAvailabilityCommandHandler(IUnitOfWorkSchedules unitOfWork) 
    : ICommandHandler<CreateAvailabilityCommand, Result<ScheduleEventDto>>
{
    public async Task<Result<ScheduleEventDto>> Handle(CreateAvailabilityCommand request, CancellationToken cancellationToken)
    {
        var availability = new GroupAvailability
        {
            GroupId = request.GroupId,
            StartAt = request.Start.ToUniversalTime(),
            EndAt = request.End.ToUniversalTime(),
            Available = request.Available,
            CustomPrice = request.CustomPrice,
            Note = request.Note
        };

        await unitOfWork.AvailabilityRepository.CreateAsync(availability);
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
