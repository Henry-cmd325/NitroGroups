using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Cortex.Mediator;
using NitroGroups.Core.Groups.Application.UseCases.Groups.GetByUserId;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Core.Users.Application.UseCases.Users.GetByAuth0Id;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Groups.Requests;
using NitroGroups.Shared.Contracts.Groups.Responses;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Tests.Endpoints.Infrastructure;
using NSubstitute;

namespace NitroGroups.Tests.Endpoints.Groups;

public class GroupMediaEndpointsTests : IClassFixture<NitroGroupsWebAppFactory>
{
    private readonly HttpClient _client;
    private readonly IMediator _mediator;
    private readonly NitroGroupsWebAppFactory _factory;

    public GroupMediaEndpointsTests(NitroGroupsWebAppFactory factory)
    {
        _factory = factory;
        _factory.ResetGroupMocks();
        _client = factory.CreateClient();
        _mediator = factory.Mediator;
    }

    [Fact]
    public async Task AddMedia_GrupoExistenteYTipoValido_Returns201()
    {
        _factory.GroupsRepository.GetByIdAsync(1).Returns(new Group { Id = 1, GroupName = "Grupo" });
        _factory.GroupMediaRepository
            .When(x => x.CreateAsync(Arg.Any<GroupMedia>()))
            .Do(call => ((GroupMedia)call[0]).Id = 123);

        var request = new AddMediaRequest
        {
            Type = "photo",
            Url = "https://cdn.test/photo.jpg",
            Title = "Promo",
            DisplayOrder = 1
        };

        var response = await _client.PostAsJsonAsync("api/groups/1/media", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal(123, body.GetProperty("id").GetInt64());
    }

    [Fact]
    public async Task AddMedia_GrupoNoExiste_Returns404()
    {
        _factory.GroupsRepository.GetByIdAsync(99).Returns((Group?)null);

        var response = await _client.PostAsJsonAsync("api/groups/99/media", new AddMediaRequest { Type = "photo", Url = "x" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AddMedia_TipoInvalido_Returns400()
    {
        _factory.GroupsRepository.GetByIdAsync(1).Returns(new Group { Id = 1, GroupName = "Grupo" });

        var response = await _client.PostAsJsonAsync("api/groups/1/media", new AddMediaRequest { Type = "invalid", Url = "x" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AssignGenres_GrupoExistente_Returns204()
    {
        _factory.GroupsRepository.GetByIdAsync(1).Returns(new Group { Id = 1, GroupName = "Grupo" });
        _factory.GroupGenresRepository.FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupGenre, bool>>>()).Returns([]);
        _factory.MusicGenresRepository.GetByIdAsync(10).Returns(new MusicGenre { Id = 10, Name = "Rock", Slug = "rock", IsActive = true });
        _factory.MusicGenresRepository.GetByIdAsync(20).Returns(new MusicGenre { Id = 20, Name = "Jazz", Slug = "jazz", IsActive = true });

        var response = await _client.PostAsJsonAsync("api/groups/1/genres", new AssignGenresRequest { GenreIds = [10, 20] });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await _factory.GroupGenresRepository.Received(2).CreateAsync(Arg.Any<GroupGenre>());
        await _factory.UnitOfWorkGroups.Received(1).CompleteAsync();
    }

    [Fact]
    public async Task AssignGenres_GrupoNoExiste_Returns404()
    {
        _factory.GroupsRepository.GetByIdAsync(1).Returns((Group?)null);

        var response = await _client.PostAsJsonAsync("api/groups/1/genres", new AssignGenresRequest { GenreIds = [10] });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RemoveGenre_Existente_Returns204()
    {
        _factory.GroupGenresRepository.FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupGenre, bool>>>())
            .Returns([new GroupGenre { Id = 1, GroupId = 1, GenreId = 10 }]);

        var response = await _client.DeleteAsync("api/groups/1/genres/10");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _factory.GroupGenresRepository.Received(1).Delete(Arg.Any<GroupGenre>());
    }

    [Fact]
    public async Task RemoveGenre_NoExiste_Returns404()
    {
        _factory.GroupGenresRepository.FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupGenre, bool>>>())
            .Returns([]);

        var response = await _client.DeleteAsync("api/groups/1/genres/10");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ListMedia_Returns200ConItems()
    {
        _factory.GroupMediaRepository.FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupMedia, bool>>>())
            .Returns([
                new GroupMedia { Id = 1, GroupId = 1, Url = "https://cdn.test/1.jpg", Type = MediaType.Photo, Title = "Uno", DisplayOrder = 2, CreatedAt = new DateTime(2025,1,2,0,0,0,DateTimeKind.Utc) },
                new GroupMedia { Id = 2, GroupId = 1, Url = "https://cdn.test/2.jpg", Type = MediaType.Photo, Title = "Dos", DisplayOrder = 1, CreatedAt = new DateTime(2025,1,3,0,0,0,DateTimeKind.Utc) }
            ]);

        var response = await _client.GetAsync("api/groups/1/media?limit=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<GroupMediaListResponse>(ApiJsonOptions.Default);
        Assert.NotNull(body);
        Assert.Equal(2, body!.Items.Count);
    }

    [Fact]
    public async Task RemoveMedia_Existente_Returns204()
    {
        _factory.GroupMediaRepository.FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupMedia, bool>>>())
            .Returns([new GroupMedia { Id = 5, GroupId = 1, Url = "https://cdn.test/a.jpg", Type = MediaType.Photo }]);

        var response = await _client.DeleteAsync("api/groups/1/media/5");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _factory.GroupMediaRepository.Received(1).Delete(Arg.Any<GroupMedia>());
    }

    [Fact]
    public async Task RemoveMedia_NoExiste_Returns404()
    {
        _factory.GroupMediaRepository.FindAsync(Arg.Any<System.Linq.Expressions.Expression<Func<GroupMedia, bool>>>())
            .Returns([]);

        var response = await _client.DeleteAsync("api/groups/1/media/5");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UploadGroupMediaFile_ValidMultipart_Returns200()
    {
        _mediator.SendQueryAsync<GetByAuth0IdQuery, UserDto?>(Arg.Any<GetByAuth0IdQuery>())
            .Returns(new UserDto { Id = 7, Auth0Id = "auth0|test-user-id", Email = "test@example.com" });
        _mediator.SendQueryAsync<GetGroupByUserIdQuery, Result<GroupResponse?>>(Arg.Any<GetGroupByUserIdQuery>())
            .Returns(Result<GroupResponse?>.Success(new GroupResponse { Id = 1, OwnerUserId = 7, GroupName = "Grupo" }));

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent([1, 2, 3, 4]);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "photo.jpg");

        var response = await _client.PostAsync("api/groups/1/media/upload", content);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal("https://cdn.test/uploaded-file.jpg", body.GetProperty("url").GetString());
        Assert.Equal("photo", body.GetProperty("mediaType").GetString());
    }

    [Fact]
    public async Task UploadGroupMediaFile_SinMultipart_Returns400()
    {
        var response = await _client.PostAsJsonAsync("api/groups/1/media/upload", new { a = 1 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UploadGroupMediaFile_UsuarioNoRegistrado_Returns403()
    {
        _mediator.SendQueryAsync<GetByAuth0IdQuery, UserDto?>(Arg.Any<GetByAuth0IdQuery>())
            .Returns((UserDto?)null);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent([1, 2, 3]);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "photo.jpg");

        var response = await _client.PostAsync("api/groups/1/media/upload", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
