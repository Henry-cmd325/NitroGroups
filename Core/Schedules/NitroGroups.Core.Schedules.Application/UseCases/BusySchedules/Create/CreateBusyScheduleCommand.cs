using Cortex.Mediator.Commands;
using NitroGroups.Core.Schedules.Domain.Entities;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.BusySchedules.Create;

public record CreateBusyScheduleCommand(
    long GroupId, 
    string Title, 
    DateTimeOffset Start, 
    DateTimeOffset End, 
    BusyScheduleSource Source = BusyScheduleSource.Personal) 
    : ICommand<Result<ScheduleEventDto>>;
