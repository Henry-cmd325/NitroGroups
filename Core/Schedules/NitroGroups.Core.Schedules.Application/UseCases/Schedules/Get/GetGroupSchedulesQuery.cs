using Cortex.Mediator.Queries;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.Schedules.Get;

public record GetGroupSchedulesQuery(long GroupId, DateTimeOffset Start, DateTimeOffset End) : IQuery<Result<List<ScheduleEventDto>>>;
