using Cortex.Mediator.Commands;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Create;

public record CreateGroupAvailabilityCommand(long GroupId, Guid IdempotencyKey, string Title, string Description, string StartAt, string EndAt) : ICommand<Result<CreateBlockResponse>>;
