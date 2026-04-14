using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.EndpointMapping;
using AutoMapper;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Genres
{
    public class GetAllGenres : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/genres", async (IUnitOfWorkGroups unitOfWork, IMapper mapper) =>
            {
                var genres = await unitOfWork.MusicGenres.FindAsync(g => g.IsActive);
                var response = mapper.Map<List<GenreListResponse>>(genres);
                return Ok(response);
            })
            .WithTags("Genres");
        }
    }
}
