using NitroGroups.Core.Availability.Domain.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace NitroGroups.Core.Availability.Infrastructure.Repositories
{
    public interface IAvailabilityRepository
    {
        Task<Availability> GetAvailabilityAsync(string status, CancellationToken cancellationToken);
    }
}