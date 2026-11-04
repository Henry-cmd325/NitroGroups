using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Bookings.Application;
using NitroGroups.Shared.Abstractions.Services;

namespace NitroGroups.Core.Bookings.Infrastructure.Endpoints.EventRequests;

internal static class BookingEndpointExtensions
{
    public const string Tag = "EventRequests";
    private const string NotSyncedMessage = "Usuario no registrado. Llama a POST /api/auth/sync primero.";

    /// <summary>
    /// 401 si el usuario del token todavía no tiene id interno. Corre antes de validar el body.
    /// Con <paramref name="allowAdmin"/> el admin pasa aunque no esté sincronizado (solo lectura).
    /// </summary>
    public static TBuilder RequireSyncedUser<TBuilder>(this TBuilder builder, bool allowAdmin = false)
        where TBuilder : IEndpointConventionBuilder
        => builder.AddEndpointFilter(async (context, next) =>
        {
            var currentUser = context.HttpContext.RequestServices.GetRequiredService<ICurrentUserService>();
            if (currentUser.GetUserId() is null && !(allowAdmin && currentUser.IsAdmin()))
                return Results.Problem(NotSyncedMessage, statusCode: StatusCodes.Status401Unauthorized);

            return await next(context);
        });

    /// <summary>Traduce el resultado del caso de uso a una respuesta HTTP con ProblemDetails en español.</summary>
    public static IResult ToHttp<T>(this BookingResult<T> result, Func<T, IResult> onSuccess)
    {
        if (result.IsSuccess)
            return onSuccess(result.Value!);

        var status = result.ErrorKind switch
        {
            BookingErrorKind.Validation => StatusCodes.Status400BadRequest,
            BookingErrorKind.Unauthorized => StatusCodes.Status401Unauthorized,
            BookingErrorKind.Forbidden => StatusCodes.Status403Forbidden,
            BookingErrorKind.NotFound => StatusCodes.Status404NotFound,
            BookingErrorKind.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError
        };

        return Results.Problem(result.Error, statusCode: status);
    }
}
