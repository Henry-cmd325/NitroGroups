using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using DomainGroupAvailability = NitroGroups.Core.Schedules.Domain.Entities.GroupAvailability;

namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Create;

public class CreateGroupAvailabilityCommandHandler(IUnitOfWorkSchedules unitOfWork)
    : ICommandHandler<CreateGroupAvailabilityCommand, Result<CreateBlockResponse>>
{
    public async Task<Result<CreateBlockResponse>> Handle(CreateGroupAvailabilityCommand command, CancellationToken cancellationToken)
    {
        var entity = new DomainGroupAvailability
        {
            GroupId = command.GroupId,
            StartAt = PostgresDateTime.ParseIsoToUtc(command.StartAt),
            EndAt = PostgresDateTime.ParseIsoToUtc(command.EndAt),
            Available = false,
            Note = string.IsNullOrEmpty(command.Title) ? null : command.Title,
        };
        await unitOfWork.AvailabilityRepository.CreateAsync(entity);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        var response = new CreateBlockResponse
        {
            Id = entity.Id,
            GroupId = entity.GroupId,
            StartAt = entity.StartAt.ToString("o"),
            EndAt = entity.EndAt.ToString("o"),
            Title = command.Title,
            Description = command.Description,
            Source = "groupAvailability",
        };
        return Result<CreateBlockResponse>.Success(response);
    }
}