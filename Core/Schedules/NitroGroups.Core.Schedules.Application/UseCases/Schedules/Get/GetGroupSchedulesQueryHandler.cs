using Cortex.Mediator.Queries;
using NitroGroups.Shared.Contracts;
using NitroGroups.Core.Schedules.Application.Abstractions;
using NitroGroups.Shared.Contracts.Schedules.Responses;

namespace NitroGroups.Core.Schedules.Application.UseCases.Schedules.Get;

public class GetGroupSchedulesQueryHandler(
    IGroupAvailabilityRepository availabilityRepository,
    IBusyScheduleRepository busyScheduleRepository) 
    : IQueryHandler<GetGroupSchedulesQuery, Result<List<ScheduleEventDto>>>
{
    public async Task<Result<List<ScheduleEventDto>>> Handle(GetGroupSchedulesQuery request, CancellationToken cancellationToken)
    {
        var availabilities = await availabilityRepository.GetAvailabilitiesByGroupIdAsync(request.GroupId, request.Start.ToUniversalTime(), request.End.ToUniversalTime(), cancellationToken);
        var busySchedules = await busyScheduleRepository.GetBusySchedulesByGroupIdAsync(request.GroupId, request.Start.ToUniversalTime(), request.End.ToUniversalTime(), cancellationToken);

        var events = new List<ScheduleEventDto>();

        foreach (var av in availabilities)
        {
            events.Add(new ScheduleEventDto
            {
                Id = $"avail_{av.Id}",
                OriginalEntityId = av.Id,
                Title = av.Available ? "Disponible" : "Bloqueado",
                Start = av.StartAt,
                End = av.EndAt,
                IsAvailable = av.Available,
                BackgroundColor = av.Available ? "#34d399" : "#e2e8f0",
                BorderColor = av.Available ? "#34d399" : "#cbd5e1",
                TextColor = "#0f172a"
            });
        }

        foreach (var check in busySchedules)
        {
            events.Add(new ScheduleEventDto
            {
                Id = $"busy_{check.Id}",
                OriginalEntityId = check.Id,
                Title = check.Title ?? check.Source.ToString(),
                Start = check.StartAt,
                End = check.EndAt,
                IsAvailable = false,
                BackgroundColor = "#fb7185", // Rose-400 equivalent for occupied
                BorderColor = "#fb7185",
                TextColor = "#0f172a"
            });
        }

        return Result<List<ScheduleEventDto>>.Success(events);
    }
}
