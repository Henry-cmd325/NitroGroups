using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Remove;

public class RemoveBusyScheduleCommandHandler(IUnitOfWorkSchedules unitOfWork) 
    : ICommandHandler<RemoveBusyScheduleCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(RemoveBusyScheduleCommand request, CancellationToken cancellationToken)
    {
        var busySchedule = await unitOfWork.BusyScheduleRepository.GetByIdAsync(request.BusyScheduleId);
        
        if (busySchedule is null || busySchedule.GroupId != request.GroupId)
        {
            return "Busy Schedule not found or does not belong to the group.";
        }

        unitOfWork.BusyScheduleRepository.Delete(busySchedule);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
