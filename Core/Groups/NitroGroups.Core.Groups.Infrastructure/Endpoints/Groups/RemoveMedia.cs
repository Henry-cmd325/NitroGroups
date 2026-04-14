using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class RemoveMedia : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("api/groups/{groupId:long}/media/{mediaId:long}", async (long groupId, long mediaId, IUnitOfWorkGroups unitOfWork) =>
            {
                var items = await unitOfWork.GroupMedia.FindAsync(m => m.Id == mediaId && m.GroupId == groupId);
                var item = items.FirstOrDefault();

                if (item is null) return NotFound("Media item not found.");

                unitOfWork.GroupMedia.Delete(item);
                await unitOfWork.CompleteAsync();
                return NoContent();
            })
            .WithTags("Groups");
        }
    }
}
