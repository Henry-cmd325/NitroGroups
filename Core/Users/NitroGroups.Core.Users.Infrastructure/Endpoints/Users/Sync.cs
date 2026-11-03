using AutoMapper;
using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using NitroGroups.Core.Users.Application.UseCases.Users.Sync;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.Abstractions.Services;
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
            // La identidad sale del token, nunca del body: se pisa ANTES de validar.
            .AddEndpointFilter(async (context, next) =>
            {
                var currentUser = context.HttpContext.RequestServices.GetRequiredService<ICurrentUserService>();
                var auth0Id = currentUser.GetAuth0Id();
                if (string.IsNullOrEmpty(auth0Id))
                    return Unauthorized();

                if (context.Arguments.OfType<SyncUserRequest>().FirstOrDefault() is { } request)
                {
                    request.Auth0Id = auth0Id;
                    request.Email = currentUser.GetEmail() ?? request.Email;
                }

                return await next(context);
            })
            .AddEndpointFilter<ValidationFilter<SyncUserRequest>>()
            .WithTags("Auth");
        }
    }
}
