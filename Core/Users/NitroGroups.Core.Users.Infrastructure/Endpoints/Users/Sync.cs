using AutoMapper;
using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Application.UseCases.Users.Sync;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.EndpointMapping.Filters;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Users
{
    public class Sync : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/auth/sync", async (SyncUserRequest request, IMediator mediator, IMapper mapper) =>
            {
                var command = mapper.Map<SyncUserCommand>(request);
                var result = await mediator.SendCommandAsync<SyncUserCommand, UserDto>(command);
                return Ok(result);
            })
            .AddEndpointFilter<ValidationFilter<SyncUserRequest>>()
            .WithTags("Auth");
        }
    }
}
