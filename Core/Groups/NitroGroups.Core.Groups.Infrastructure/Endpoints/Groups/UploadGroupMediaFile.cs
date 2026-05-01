using System.Security.Claims;
using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Groups.GetByUserId;
using NitroGroups.Core.Users.Application.UseCases.Users.GetByAuth0Id;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class UploadGroupMediaFile : IEndpoint
    {
        private const int MaxBytes = 50 * 1024 * 1024;

        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            // No usar IFormFile como parámetro del delegado: en .NET 8+ implica comprobación de
            // antifalsificación y, sin AddAntiforgery/UseAntiforgery completo, el pipeline puede
            // rechazar el POST (p. ej. 405) en producción. Se lee el multipart vía Request.Form.
            app.MapPost("api/groups/{groupId:long}/media/upload", async (
                HttpContext http,
                long groupId,
                IMediator mediator,
                IGroupMediaObjectStorage groupMediaStorage,
                CancellationToken cancellationToken) =>
            {
                var auth0 = Auth0IdFromClaims(http.User);
                if (string.IsNullOrEmpty(auth0))
                {
                    return Unauthorized();
                }

                if (!http.Request.HasFormContentType)
                {
                    return Results.Json(
                        new { error = "Se espera multipart/form-data (campo 'file')." },
                        statusCode: StatusCodes.Status400BadRequest);
                }

                await http.Request.ReadFormAsync(cancellationToken);
                var file = http.Request.Form.Files["file"];
                if (file is null || file.Length == 0)
                {
                    return Results.Json(
                        new { error = "Falta el archivo (campo 'file')." },
                        statusCode: StatusCodes.Status400BadRequest);
                }

                if (file.Length > MaxBytes)
                {
                    return Results.Json(
                        new { error = $"Tamaño máximo {MaxBytes / 1024 / 1024} MB." },
                        statusCode: StatusCodes.Status400BadRequest);
                }

                var appUser = await mediator.SendQueryAsync<GetByAuth0IdQuery, UserDto?>(new GetByAuth0IdQuery(auth0));
                if (appUser is null)
                {
                    return Results.Json(
                        new { error = "Usuario no registrado" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var groupResult = await mediator.SendQueryAsync<GetGroupByUserIdQuery, Result<GroupResponse?>>(
                    new GetGroupByUserIdQuery(appUser.Id));
                if (groupResult.IsFailure || groupResult.Value is null)
                {
                    return Results.Json(
                        new { error = "No tienes un grupo" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                if (groupResult.Value.Id != groupId)
                {
                    return Results.Json(
                        new { error = "Este contenido no pertenece a tu grupo" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var mime = EffectiveMime(file);
                var mediaType = MimeToMediaType(mime);
                if (mediaType is null)
                {
                    return Results.Json(
                        new
                        {
                            error =
                                "Tipo de archivo no permitido (usa imagen, video o audio). Si es HEIC, re-exporta a JPEG."
                        },
                        statusCode: StatusCodes.Status400BadRequest);
                }

                var ext = ExtFromMime(mime, file.FileName) ?? (mediaType == "photo" ? ".bin" : ".bin");
                var objectName = Guid.NewGuid().ToString() + ext;
                var objectKey = $"groups/{groupId}/{objectName}";

                var cType = string.IsNullOrEmpty(mime) ? "application/octet-stream" : mime;

                await using var readStream = file.OpenReadStream();
                var (publicUrl, error) = await groupMediaStorage.UploadObjectAsync(
                    objectKey,
                    readStream,
                    cType,
                    cancellationToken);
                if (error is not null)
                {
                    return Results.Json(
                        new { error = error },
                        statusCode: StatusCodes.Status503ServiceUnavailable);
                }

                return Ok(new { url = publicUrl, mediaType });
            })
            .WithTags("Groups")
            .RequireAuthorization();
        }

        private static string? Auth0IdFromClaims(ClaimsPrincipal user)
        {
            var id = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(id))
            {
                return id;
            }

            return user.FindFirst("sub")?.Value;
        }

        private static string EffectiveMime(IFormFile file)
        {
            if (!string.IsNullOrEmpty(file.ContentType) && !string.IsNullOrWhiteSpace(file.ContentType))
            {
                return file.ContentType.Trim();
            }

            return InferMimeFromName(file.FileName);
        }

        private static string InferMimeFromName(string? name)
        {
            if (string.IsNullOrEmpty(name) || !name.Contains('.'))
            {
                return string.Empty;
            }

            var ext = name[name.LastIndexOf('.')..].ToLowerInvariant();
            return ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                ".heic" => "image/heic",
                ".heif" => "image/heif",
                ".mp4" => "video/mp4",
                ".webm" => "video/webm",
                ".mov" => "video/quicktime",
                ".mp3" => "audio/mpeg",
                ".wav" => "audio/wav",
                ".ogg" => "audio/ogg",
                _ => string.Empty
            };
        }

        private static string? MimeToMediaType(string mime) =>
            mime.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ? "photo"
            : mime.StartsWith("video/", StringComparison.OrdinalIgnoreCase) ? "video"
            : mime.StartsWith("audio/", StringComparison.OrdinalIgnoreCase) ? "audio"
            : null;

        private static string? ExtFromMime(string mime, string fileName)
        {
            if (fileName.Contains('.'))
            {
                var f = fileName[fileName.LastIndexOf('.')..];
                if (f.Length is > 0 and <= 8)
                {
                    return f.ToLowerInvariant();
                }
            }

            return mime switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/gif" => ".gif",
                "image/heic" => ".heic",
                "image/heif" => ".heif",
                "video/mp4" => ".mp4",
                "video/webm" => ".webm",
                "video/quicktime" => ".mov",
                "audio/mpeg" => ".mp3",
                "audio/wav" => ".wav",
                "audio/ogg" => ".ogg",
                _ => null
            };
        }
    }
}
