using System.Net;
using System.Net.Http.Json;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Tests.Endpoints.Infrastructure;

namespace NitroGroups.Tests.Endpoints.Groups;

/// <summary>
/// Tests para GET api/genres.
/// IUnitOfWorkGroups.MusicGenres está mockeado en la factory devolviendo lista vacía.
/// </summary>
public class GenresEndpointsTests(NitroGroupsWebAppFactory factory) : IClassFixture<NitroGroupsWebAppFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    // ---------------------------------------------------------------
    // GET api/genres
    // ---------------------------------------------------------------

    [Fact]
    public async Task GetAllGenres_Returns200()
    {
        var response = await _client.GetAsync("api/genres");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAllGenres_RetornaListaVacia_CuandoNoHayGeneros()
    {
        var response = await _client.GetAsync("api/genres");
        var result = await response.Content.ReadFromJsonAsync<List<GenreListResponse>>(ApiJsonOptions.Default);

        Assert.NotNull(result);
        Assert.Empty(result!);
    }
}

