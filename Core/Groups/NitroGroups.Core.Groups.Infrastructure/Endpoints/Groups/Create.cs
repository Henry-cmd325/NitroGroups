using AutoMapper;
using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Groups.Create;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Requests;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.EndpointMapping.Filters;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class Create : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/groups", async (CreateGroupRequest request, IMediator mediator, IMapper mapper) =>
            {
                var command = mapper.Map<CreateGroupCommand>(request);

                var result = await mediator.SendCommandAsync<CreateGroupCommand, Result<GroupResponse>>(command);

                if (result.IsFailure)
                {
                    return BadRequest(result.Error);
                }

                return Created($"api/groups/{result.Value!.Id}", result.Value);
            })
            .AddEndpointFilter<ValidationFilter<CreateGroupRequest>>()
            .WithTags("Groups");
        }
    }
}
