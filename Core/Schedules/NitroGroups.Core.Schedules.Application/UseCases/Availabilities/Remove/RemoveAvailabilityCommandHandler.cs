using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Remove;

public class RemoveAvailabilityCommandHandler(IUnitOfWorkSchedules unitOfWork) 
    : ICommandHandler<RemoveAvailabilityCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(RemoveAvailabilityCommand request, CancellationToken cancellationToken)
    {
        var availability = await unitOfWork.AvailabilityRepository.GetByIdAsync(request.AvailabilityId);
        
        if (availability is null || availability.GroupId != request.GroupId)
        {
            return "Availability not found or does not belong to the group.";
        }

        unitOfWork.AvailabilityRepository.Delete(availability);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
