using Cortex.Mediator.Commands;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Delete;

public record DeleteGroupAvailabilityCommand(long GroupId, long Id) : ICommand<Result<DeleteResponse>>;
