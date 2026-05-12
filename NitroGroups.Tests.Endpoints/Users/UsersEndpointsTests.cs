using Cortex.Mediator;
using NitroGroups.Core.Users.Application.UseCases.Users.Create;
using NitroGroups.Core.Users.Application.UseCases.Users.GetByAuth0Id;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NitroGroups.Tests.Endpoints.Infrastructure;
using NSubstitute;
using System.Net;
using System.Net.Http.Json;

namespace NitroGroups.Tests.Endpoints.Users;

public class UsersEndpointsTests(NitroGroupsWebAppFactory factory) : IClassFixture<NitroGroupsWebAppFactory>
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly IMediator _mediator = factory.Mediator;

    // ---------------------------------------------------------------
    // GET api/users  (requiere autorización)
    // ---------------------------------------------------------------

    [Fact]
    public async Task GetAllUsers_ConAutenticacion_Returns200()
    {
        // En el entorno de test el TestAuthHandler aprueba toda petición autenticada.
        // El IMediator devuelve null por defecto → el endpoint retorna 200 con null.
        var response = await _client.GetAsync("api/users");

        // El endpoint requiere autorización; con el TestScheme activo pasa la auth.
        Assert.True(
            response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NoContent,
            $"Status inesperado: {response.StatusCode}");
    }

    // ---------------------------------------------------------------
    // GET api/users/auth0/{auth0Id}  (requiere autorización)
    // ---------------------------------------------------------------

    [Fact]
    public async Task GetByAuth0_ExistingUser_Returns200()
    {
        var auth0Id = "auth0|abc123";
        var userDto = new UserDto { Id = 5, Auth0Id = auth0Id, Email = "test@example.com" };

        _mediator
            .SendQueryAsync<GetByAuth0IdQuery, UserDto?>(Arg.Any<GetByAuth0IdQuery>())
            .Returns(userDto);

        using var request = new HttpRequestMessage(HttpMethod.Get,
            $"api/users/auth0/{Uri.EscapeDataString(auth0Id)}");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue(
                TestAuthHandler.SchemeName, "test-token");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<UserDto>(ApiJsonOptions.Default);
        Assert.NotNull(result);
        Assert.Equal(userDto.Email, result!.Email);
    }

    [Fact]
    public async Task GetByAuth0_NonExistingUser_Returns404()
    {
        _mediator
            .SendQueryAsync<GetByAuth0IdQuery, UserDto?>(Arg.Any<GetByAuth0IdQuery>())
            .Returns((UserDto?)null);

        using var request = new HttpRequestMessage(HttpMethod.Get, "api/users/auth0/noexiste");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue(
                TestAuthHandler.SchemeName, "test-token");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ---------------------------------------------------------------
    // POST api/users
    // ---------------------------------------------------------------

    [Fact]
    public async Task CreateUser_ValidRequest_Returns201()
    {
        var request = new CreateUserRequest
        {
            Auth0Id = "auth0|new",
            Email = "nuevo@example.com",
            FirstName = "Juan",
            LastName = "García",
            UserType = UserType.Client
        };
        var created = new UserDto { Id = 10, Email = request.Email };

        _mediator
            .SendCommandAsync<CreateUserCommand, UserDto>(Arg.Any<CreateUserCommand>())
            .Returns(created);

        var response = await _client.PostAsJsonAsync("api/users", request, ApiJsonOptions.Default);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<UserDto>(ApiJsonOptions.Default);
        Assert.Equal(request.Email, result!.Email);
    }

    [Fact]
    public async Task CreateUser_SinCamposRequeridos_Returns400()
    {
        // Auth0Id y Email vacíos deben fallar la validación
        var request = new CreateUserRequest
        {
            Auth0Id = string.Empty,
            Email = string.Empty,
            FirstName = string.Empty,
            LastName = string.Empty,
            UserType = UserType.Client
        };

        var response = await _client.PostAsJsonAsync("api/users", request, ApiJsonOptions.Default);

        Assert.True(
            response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity,
            $"Status inesperado: {response.StatusCode}");
    }
}
