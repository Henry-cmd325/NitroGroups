using Cortex.Mediator.Queries;
using NitroGroups.Shared.Contracts;

namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Get;

public record GetGroupAvailabilityQuery(
    long GroupId,
    string Start,
    string End,
    string? Source,
    string? TypeFilter) : IQuery<Result<ListScheduleResponse>>;
