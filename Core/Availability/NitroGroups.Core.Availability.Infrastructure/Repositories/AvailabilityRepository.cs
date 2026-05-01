using NitroGroups.Core.Availability.Domain.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace NitroGroups.Core.Availability.Infrastructure.Repositories
{
    public class AvailabilityRepository : IAvailabilityRepository
    {
        public async Task<Availability> GetAvailabilityAsync(string status, CancellationToken cancellationToken)
        {
            // Implementación de la lógica de acceso a datos
            // ...
            return Availability.Create(1, status, DateTime.Now.Ticks);
        }
    }
}