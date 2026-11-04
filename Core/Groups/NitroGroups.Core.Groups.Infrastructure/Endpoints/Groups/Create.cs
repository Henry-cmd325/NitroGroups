using AutoMapper;
using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Groups.Create;
using NitroGroups.Shared.Abstractions.Services;
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
            app.MapPost("api/groups", async (CreateGroupRequest request, IMediator mediator, IMapper mapper, ICurrentUserService currentUser) =>
            {
                // El dueño siempre es el usuario autenticado; se ignora OwnerUserId del body.
                var ownerId = currentUser.GetUserId();
                if (ownerId is null)
                    return Problem("Usuario no registrado. Llama a POST /api/auth/sync primero.", statusCode: StatusCodes.Status401Unauthorized);

                var command = mapper.Map<CreateGroupCommand>(request) with { OwnerUserId = ownerId.Value };

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
