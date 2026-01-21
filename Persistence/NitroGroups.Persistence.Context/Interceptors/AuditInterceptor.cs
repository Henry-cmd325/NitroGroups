using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NitroGroups.Shared.Domain;
using System;
using System.Collections.Generic;
using System.Text;

namespace NitroGroups.Persistence.Context.Interceptors
{
    public class AuditInterceptor : SaveChangesInterceptor
    {
        private readonly ICurrentUserService _userService;

        public AuditInterceptor(ICurrentUserService userService)
        {
            _userService = userService; // Este servicio lee el ClaimsPrincipal del HttpContext
        }

        private void UpdateEntities(DbContext? context)
        {
            var userId = _userService.GetUserId(); // "admin", "usuario_123", etc.

            if (context == null) return;

            // Obtenemos el ID del usuario desde tu servicio de identidad
            var userId = _userService.GetUserId();
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

                        // 2. Llenamos los campos de auditoría de borrado
                        entry.Entity.IsDeleted = true;
                        entry.Entity.DeletedAt = now;
                        entry.Entity.DeletedBy = userId;

                        // Opcional: También podrías querer marcar quién lo actualizó por última vez
                        entry.Entity.UpdatedAt = now;
                        entry.Entity.UpdatedBy = userId;
                        break;
                }
            }
        }
    }
}
