using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Domain;

namespace NitroGroups.Shared.Infrastructure.Context.Interceptors
{
    public class AuditInterceptor(ICurrentUserService userService) : SaveChangesInterceptor
    {
        private readonly ICurrentUserService _userService = userService;

        public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
        {
            UpdateEntities(eventData.Context);
            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            UpdateEntities(eventData.Context);
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        private void UpdateEntities(DbContext? context)
        {
            var userId = _userService.GetUserId();

            if (context == null) return;

            var now = DateTime.UtcNow;

            foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
            {
                switch (entry.State)
                {
                    case EntityState.Modified:
                        entry.Entity.UpdatedAt = now;
                        entry.Entity.UpdatedBy = userId;
                        break;

                    case EntityState.Deleted:
                        // INTERCEPCIÓN DEL BORRADO:
                        // 1. Cambiamos el estado de 'Deleted' a 'Modified'
                        // Esto le dice a EF: "No hagas un DELETE, haz un UPDATE"
                        entry.State = EntityState.Modified;

                        entry.Entity.IsDeleted = true;
                        entry.Entity.DeletedAt = now;
                        entry.Entity.DeletedBy = userId;
                        break;
                }
            }
        }
    }
}
