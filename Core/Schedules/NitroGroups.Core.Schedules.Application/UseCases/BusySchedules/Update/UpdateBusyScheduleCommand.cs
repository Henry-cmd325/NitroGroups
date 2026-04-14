using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Update;

public record UpdateBusyScheduleCommand(
    long GroupId,
    long BusyScheduleId,
    DateTimeOffset Start,
    DateTimeOffset End,
    string? Title,
    BusyScheduleSource? Source) : ICommand<Result<ScheduleEventDto>>;
