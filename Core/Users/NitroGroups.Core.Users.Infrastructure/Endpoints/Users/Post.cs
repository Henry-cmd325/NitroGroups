using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Application.Dtos;
using NitroGroups.Core.Users.Application.Dtos.Requests;
using NitroGroups.Core.Users.Application.UseCases.Users.Create;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.EndpointMapping.Filters;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Users
{
    public class Post : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/users", async (CreateUserRequest request, IMediator mediator) =>
            {
                var command = new CreateUserCommand(
                    request.Auth0Id,
                    request.Email,
                    request.FirstName,
                    request.LastName,
                    request.UserType
                );

                var createdUser = await mediator.SendCommandAsync<CreateUserCommand, UserDto>(command);
                return Created(createdUser);
            })
            .AddEndpointFilter<ValidationFilter<CreateUserRequest>>();
        }
    }
}
