using Cortex.Mediator.Queries;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Shared.Contracts;
using GroupAvailabilityEntity = NitroGroups.Core.Schedules.Domain.Entities.GroupAvailability;

namespace NitroGroups.Core.Schedules.Application.UseCases.GroupAvailability.Get;

public class GetGroupAvailabilityQueryHandler(IUnitOfWorkSchedules unitOfWork)
    : IQueryHandler<GetGroupAvailabilityQuery, Result<ListScheduleResponse>>
{
    public async Task<Result<ListScheduleResponse>> Handle(GetGroupAvailabilityQuery request, CancellationToken cancellationToken)
    {
        if (!DateTimeOffset.TryParse(request.Start, null, System.Globalization.DateTimeStyles.RoundtripKind, out var start)
            || !DateTimeOffset.TryParse(request.End, null, System.Globalization.DateTimeStyles.RoundtripKind, out var end))
        {
            return Result<ListScheduleResponse>.Failure("Parámetros 'start' y 'end' deben ser fechas-hora válidas (ISO-8601).");
        }

        if (end <= start)
        {
            return Result<ListScheduleResponse>.Failure("El rango de fechas es inválido (end debe ser mayor que start).");
        }

        start = start.ToUniversalTime();
        end = end.ToUniversalTime();

        var rows = await unitOfWork.AvailabilityRepository.GetAvailabilitiesByGroupIdAsync(
            request.GroupId,
            start,
            end,
            cancellationToken);

        IEnumerable<GroupAvailabilityEntity> filtered = rows;
        if (!string.IsNullOrWhiteSpace(request.TypeFilter) && !string.Equals(request.TypeFilter, "all", StringComparison.OrdinalIgnoreCase))
        {
            var tf = request.TypeFilter.Trim();
            if (string.Equals(tf, "busy", StringComparison.OrdinalIgnoreCase))
            {
                filtered = filtered.Where(x => !x.Available);
            }
            else if (string.Equals(tf, "blocks", StringComparison.OrdinalIgnoreCase))
            {
                filtered = filtered.Where(x => !x.Available);
            }
        }

        var items = filtered.Select(e => new ScheduleItemDto
        {
            Id = e.Id,
            GroupId = e.GroupId,
            StartAt = e.StartAt.ToString("o"),
            EndAt = e.EndAt.ToString("o"),
            Type = e.Available ? "available" : "block",
            Title = e.Note ?? string.Empty,
            Description = string.Empty,
            Source = "groupAvailability",
            Available = e.Available,
            CustomPrice = e.CustomPrice,
            Note = e.Note ?? string.Empty,
            RRule = e.RRule ?? string.Empty,
            Timezone = e.Timezone
        }).ToList();

        return Result<ListScheduleResponse>.Success(new ListScheduleResponse { Items = items });
    }
}
