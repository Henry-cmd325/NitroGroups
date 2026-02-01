using AutoMapper;
using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Groups.Update;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Requests;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class Update : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPut("/groups/{id:long}", async (long id, GroupRequest request, IMediator mediator, IMapper mapper) =>
            {
                var command = mapper.Map<UpdateGroupCommand>(request, opt => opt.Items["Id"] = id);
                var result = await mediator.SendCommandAsync<UpdateGroupCommand, Result<bool>>(command);
                return result.IsSuccess ? NoContent() : BadRequest(result.Error);
            })
            .WithTags("Groups");
        }
    }
}
