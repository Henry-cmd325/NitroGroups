using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Shared.Contracts;
using DomainGroupAvailability = NitroGroups.Core.Schedules.Domain.Entities.GroupAvailability;

namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Update;

public class UpdateGroupAvailabilityCommandHandler(IUnitOfWorkSchedules unitOfWork)
    : ICommandHandler<UpdateGroupAvailabilityCommand, Result<UpdateScheduleItemResponse>>
{
    public async Task<Result<UpdateScheduleItemResponse>> Handle(UpdateGroupAvailabilityCommand command, CancellationToken cancellationToken)
    {
        var entity = await unitOfWork.AvailabilityRepository.GetByIdAsync(command.Id);
        if (entity is null) return Result<UpdateScheduleItemResponse>.Failure("GroupAvailability no encontrado.");
        if (entity.GroupId != command.GroupId)
        {
            return Result<UpdateScheduleItemResponse>.Failure("El ítem no pertenece al grupo indicado.");
        }

        if (command.Title is not null)
        {
            entity.Note = string.IsNullOrEmpty(command.Title) ? null : command.Title;
        }

        if (command.StartAt is not null)
        {
            entity.StartAt = PostgresDateTime.ParseIsoToUtc(command.StartAt);
        }

        if (command.EndAt is not null)
        {
            entity.EndAt = PostgresDateTime.ParseIsoToUtc(command.EndAt);
        }

        unitOfWork.AvailabilityRepository.Update(entity);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        var response = new UpdateScheduleItemResponse
        {
            Id = entity.Id,
            GroupId = entity.GroupId,
            StartAt = entity.StartAt.ToString("o"),
            EndAt = entity.EndAt.ToString("o"),
            Title = entity.Note ?? string.Empty,
            Description = command.Description ?? string.Empty,
            Source = "groupAvailability",
        };
        return Result<UpdateScheduleItemResponse>.Success(response);
    }
}
