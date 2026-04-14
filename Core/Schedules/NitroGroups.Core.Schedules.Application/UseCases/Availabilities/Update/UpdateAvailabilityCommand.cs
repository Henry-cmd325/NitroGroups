using Cortex.Mediator.Commands;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.Availabilities.Update;

public record UpdateAvailabilityCommand(
    long GroupId,
    long AvailabilityId,
    DateTimeOffset Start,
    DateTimeOffset End,
    bool? Available,
    decimal? CustomPrice,
    string? Note) : ICommand<Result<ScheduleEventDto>>;
