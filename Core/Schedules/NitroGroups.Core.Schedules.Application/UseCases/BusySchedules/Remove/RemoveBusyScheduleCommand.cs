using Cortex.Mediator.Commands;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Remove;

public record RemoveBusyScheduleCommand(long GroupId, long BusyScheduleId) : ICommand<Result<bool>>;
