using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Contracts.Groups.Requests;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class AddMedia : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/groups/{groupId:long}/media", async (long groupId, AddMediaRequest request, IUnitOfWorkGroups unitOfWork) =>
            {
                var group = await unitOfWork.Groups.GetByIdAsync(groupId);
                if (group is null) return NotFound("Group not found.");

                if (!Enum.TryParse<MediaType>(request.Type, true, out var mediaType))
                    return BadRequest("Invalid media type. Use: photo, video, or audio.");

                var media = new GroupMedia
                {
                    GroupId = groupId,
                    Type = mediaType,
                    Url = request.Url,
                    ThumbnailUrl = request.ThumbnailUrl,
                    Title = request.Title,
                    DisplayOrder = request.DisplayOrder,
                    IsPrimary = false
                };

                await unitOfWork.GroupMedia.CreateAsync(media);
                await unitOfWork.CompleteAsync();

                return Created($"/api/groups/{groupId}/media/{media.Id}", new { media.Id });
            })
            .WithTags("Groups");
        }
    }
}
