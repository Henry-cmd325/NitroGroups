using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Groups.GetMembersRoleByIdGroup;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class GetMembersRoleByIdGroup : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/groups/{groupId:long}/members", async (long groupId, IMediator mediator) =>
            {
                var result = await mediator.SendQueryAsync<GetMembersRoleByIdGroupQuery, Result<List<GroupMemberResponse>>>(new(groupId));

                return result.IsSuccess
                    ? Ok(result.Value)
                    : NotFound(result.Error);
            })
            .WithTags("Groups");
        }
    }
}
