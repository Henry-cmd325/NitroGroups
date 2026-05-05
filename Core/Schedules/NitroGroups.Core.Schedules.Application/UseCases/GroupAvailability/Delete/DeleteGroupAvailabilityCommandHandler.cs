using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using DomainGroupAvailability = NitroGroups.Core.Schedules.Domain.Entities.GroupAvailability;

namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Delete;

public class DeleteGroupAvailabilityCommandHandler(IUnitOfWorkSchedules unitOfWork)
    : ICommandHandler<DeleteGroupAvailabilityCommand, Result<DeleteResponse>>
{
    public async Task<Result<DeleteResponse>> Handle(DeleteGroupAvailabilityCommand command, CancellationToken cancellationToken)
    {
        var entity = await unitOfWork.AvailabilityRepository.GetByIdAsync(command.Id);
        if (entity is null) return Result<DeleteResponse>.Failure("GroupAvailability no encontrado.");
        unitOfWork.AvailabilityRepository.Delete(entity);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<DeleteResponse>.Success(new DeleteResponse { Success = true });
    }
}