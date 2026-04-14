using AutoMapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.Abstractions;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class ListMedia : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/groups/{groupId:long}/media", async (long groupId, IUnitOfWorkGroups unitOfWork, IMapper mapper) =>
            {
                var items = await unitOfWork.GroupMedia.FindAsync(m => m.GroupId == groupId);
                var sorted = items.OrderBy(m => m.DisplayOrder).ToList();
                var response = mapper.Map<List<GroupMediaResponse>>(sorted);
                return Ok(response);
            })
            .WithTags("Groups");
        }
    }
}
