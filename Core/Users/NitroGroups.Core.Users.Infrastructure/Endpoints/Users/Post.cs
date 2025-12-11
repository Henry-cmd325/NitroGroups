using AutoMapper;
using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Application.UseCases.Users.Create;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.EndpointMapping.Filters;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Users
{
    public class Post : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/users", async (CreateUserRequest request, IMediator mediator, IMapper mapper) =>
            {
                var command = mapper.Map<CreateUserCommand>(request);

                var createdUser = await mediator.SendCommandAsync<CreateUserCommand, UserDto>(command);
                return Created($"api/users/{createdUser.Id}", createdUser);
            })
            .RequireAuthorization()
            .AddEndpointFilter<ValidationFilter<CreateUserRequest>>();
        }
    }
}
