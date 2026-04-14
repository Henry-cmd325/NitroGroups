using Cortex.Mediator.Commands;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Create;

public record CreateAvailabilityCommand(
    long GroupId, 
    DateTimeOffset Start, 
    DateTimeOffset End, 
    bool Available = true,
    decimal? CustomPrice = null,
    string? Note = null) 
    : ICommand<Result<ScheduleEventDto>>;
