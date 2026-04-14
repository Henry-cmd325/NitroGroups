using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class RemoveGenre : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("api/groups/{groupId:long}/genres/{genreId:long}", async (long groupId, long genreId, IUnitOfWorkGroups unitOfWork) =>
            {
                var items = await unitOfWork.GroupGenres.FindAsync(gg => gg.GroupId == groupId && gg.GenreId == genreId);
                var item = items.FirstOrDefault();

                if (item is null) return NotFound("Genre assignment not found.");

                unitOfWork.GroupGenres.Delete(item);
                await unitOfWork.CompleteAsync();
                return NoContent();
            })
            .WithTags("Groups");
        }
    }
}
