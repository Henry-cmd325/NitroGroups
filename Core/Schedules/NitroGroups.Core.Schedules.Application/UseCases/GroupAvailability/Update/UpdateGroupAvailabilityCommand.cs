using Cortex.Mediator.Commands;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Update;

public record UpdateGroupAvailabilityCommand(
    long GroupId,
    long Id,
    string? Title,
    string? Description,
    string? StartAt,
    string? EndAt) : ICommand<Result<UpdateScheduleItemResponse>>;
