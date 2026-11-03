using Cortex.Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Groups.Application.UseCases.Groups.Search;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Groups.Infrastructure.Endpoints.Groups
{
    /// <summary>Buscador público de grupos (S9).</summary>
    public class Search : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("api/groups/search", async (
                    IMediator mediator,
                    string? q,
                    string? genre,
                    string? city,
                    decimal? maxPrice,
                    DateOnly? date,
                    int page = 1,
                    int size = 12) =>
                {
                    if (maxPrice is < 0)
                        return ValidationProblem(new Dictionary<string, string[]> { ["maxPrice"] = ["El presupuesto no puede ser negativo."] });

                    var result = await mediator.SendQueryAsync<SearchGroupsQuery, PagedResult<GroupSearchItem>>(
                        new SearchGroupsQuery(q, genre, city, maxPrice, date, page, size));
                    return Ok(result);
                })
                .AllowAnonymous()
                .WithTags("Groups");
        }
    }
}
