using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Bookings.Application.Abstractions;
using NitroGroups.Core.Bookings.Domain.Entities;
using NitroGroups.Core.Bookings.Infrastructure.Persistence;
using NitroGroups.Shared.Domain.DomainEvents.Bookings.Enums;
using NitroGroups.Shared.Infrastructure.Repository;

namespace NitroGroups.Core.Bookings.Infrastructure.Repositories;

internal sealed class EventRequestRepository(BookingsDbContext dbContext)
    : GenericRepository<EventRequest, long>(dbContext), IEventRequestRepository
{
    public Task<EventRequest?> GetWithMessagesAsync(long id, CancellationToken cancellationToken = default)
        => dbContext.EventRequests
            .Include(r => r.Messages)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public Task<List<EventRequest>> ListByClientAsync(long clientUserId, CancellationToken cancellationToken = default)
        => dbContext.EventRequests.AsNoTracking()
            .Where(r => r.ClientUserId == clientUserId)
            .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
            .ToListAsync(cancellationToken);

    public Task<List<EventRequest>> ListByGroupAsync(long groupId, EventRequestStatus? status, CancellationToken cancellationToken = default)
    {
        var query = dbContext.EventRequests.AsNoTracking().Where(r => r.GroupId == groupId);
        if (status is not null)
            query = query.Where(r => r.Status == status);

        return query
            .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
            .ToListAsync(cancellationToken);
    }
}
