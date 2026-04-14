using Cortex.Mediator.Commands;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Remove;

public record RemoveAvailabilityCommand(long GroupId, long AvailabilityId) : ICommand<Result<bool>>;
