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
    public class AssignGenres : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/groups/{groupId:long}/genres", async (long groupId, AssignGenresRequest request, IUnitOfWorkGroups unitOfWork) =>
            {
                // Verify group exists
                var group = await unitOfWork.Groups.GetByIdAsync(groupId);
                if (group is null) return NotFound("Group not found.");

                // Remove existing genres for this group
                var existing = await unitOfWork.GroupGenres.FindAsync(gg => gg.GroupId == groupId);
                foreach (var item in existing)
                    unitOfWork.GroupGenres.Delete(item);

                // Add new genres
                foreach (var genreId in request.GenreIds)
                {
                    var genre = await unitOfWork.MusicGenres.GetByIdAsync(genreId);
                    if (genre is null) continue;

                    await unitOfWork.GroupGenres.CreateAsync(new GroupGenre
                    {
                        GroupId = groupId,
                        GenreId = genreId,
                        IsPrimary = genreId == request.GenreIds[0] // first one is primary
                    });
                }

                await unitOfWork.CompleteAsync();
                return NoContent();
            })
            .WithTags("Groups");
        }
    }
}
