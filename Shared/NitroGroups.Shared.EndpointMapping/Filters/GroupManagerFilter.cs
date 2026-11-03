using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts.Modules;

namespace NitroGroups.Shared.EndpointMapping.Filters
{
    /// <summary>
    /// Solo deja pasar al Owner o a un Manager activo del grupo indicado en la ruta.
    /// 401 si no hay usuario registrado, 404 si el grupo no existe, 403 si no lo administra.
    /// Los admins pasan siempre. El handler debe verificar además que el recurso hijo
    /// (media, género, horario) pertenezca a ese grupo.
    /// </summary>
    public sealed class GroupManagerFilter(string routeParameter) : IEndpointFilter
    {
        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var http = context.HttpContext;
            var currentUser = http.RequestServices.GetRequiredService<ICurrentUserService>();
            var groups = http.RequestServices.GetRequiredService<IGroupsModuleApi>();

            if (!long.TryParse(http.Request.RouteValues[routeParameter]?.ToString(), out var groupId))
                return Results.Problem($"Parámetro de ruta '{routeParameter}' inválido.", statusCode: StatusCodes.Status400BadRequest);

            // El admin de la plataforma (rol de Auth0) puede administrar cualquier grupo,
            // aunque todavía no tenga registro en users.
            if (currentUser.IsAdmin())
                return await next(context);

            var userId = currentUser.GetUserId();
            if (userId is null)
                return Results.Problem("Usuario no registrado. Llama a POST /api/auth/sync primero.", statusCode: StatusCodes.Status401Unauthorized);

            if (!await groups.GroupExistsAsync(groupId, http.RequestAborted))
                return Results.Problem("Grupo no encontrado.", statusCode: StatusCodes.Status404NotFound);

            if (!await groups.CanManageGroupAsync(groupId, userId.Value, http.RequestAborted))
                return Results.Problem("No administras este grupo.", statusCode: StatusCodes.Status403Forbidden);

            return await next(context);
        }
    }

    public static class GroupManagerFilterExtensions
    {
        /// <summary>Exige que el usuario actual sea Owner o Manager del grupo de la ruta.</summary>
        public static TBuilder RequireGroupManager<TBuilder>(this TBuilder builder, string routeParameter = "groupId")
            where TBuilder : IEndpointConventionBuilder
            => builder.AddEndpointFilter(new GroupManagerFilter(routeParameter));
    }
}
