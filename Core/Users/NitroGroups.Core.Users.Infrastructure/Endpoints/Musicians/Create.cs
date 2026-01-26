using AutoMapper;
using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Application.UseCases.Musicians.Create;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.EndpointMapping.Filters;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Musicians
{
    public class Create : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/musicians", async (CreateMusicianRequest request, IMediator mediator, IMapper mapper) =>
            {
                var command = mapper.Map<CreateMusicianCommand>(request);

                var createdMusician = await mediator.SendCommandAsync<CreateMusicianCommand, Result<MusicianDto>>(command);

                if (createdMusician.IsFailure)
                {
                    return BadRequest(createdMusician.Error);
                }

                return Created($"api/musicians/{createdMusician.Value!.Id}", createdMusician.Value);
            })
            .AddEndpointFilter<ValidationFilter<CreateMusicianRequest>>()
            .WithTags("Musicians");
        }
    }
}