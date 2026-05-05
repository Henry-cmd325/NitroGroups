using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Groups.CheckSlugAvailability;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    public class CheckSlugAvailability : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/groups/check-slug/{slug}", async (string slug, IMediator mediator) =>
            {
                var result = await mediator.SendQueryAsync<CheckSlugAvailabilityQuery, Result<bool>>(new(slug));

                if (result.IsFailure)
                    return BadRequest(result.Error);

                return Ok(new { available = result.Value });
            })
            .WithTags("Groups");
        }
    }
}
