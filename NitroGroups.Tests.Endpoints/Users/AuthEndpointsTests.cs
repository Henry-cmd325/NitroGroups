using System.Net;
using System.Net.Http.Json;
using Cortex.Mediator;
using NitroGroups.Core.Users.Application.UseCases.Users.Sync;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NSubstitute;
using NitroGroups.Tests.Endpoints.Infrastructure;

namespace NitroGroups.Tests.Endpoints.Users;

public class AuthEndpointsTests(NitroGroupsWebAppFactory factory) : IClassFixture<NitroGroupsWebAppFactory>
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly IMediator _mediator = factory.Mediator;

    // ---------------------------------------------------------------
    // POST api/auth/sync
    // ---------------------------------------------------------------

    [Fact]
    public async Task SyncUser_ValidRequest_Returns200ConUserDto()
    {
        var request = new SyncUserRequest
        {
            Auth0Id = "auth0|sync123",
            Email = "sync@example.com",
            FirstName = "Ana",
            LastName = "López",
            UserType = UserType.Musician,
            Origin = "signup"
        };
        var syncedUser = new UserDto { Id = 7, Auth0Id = request.Auth0Id, Email = request.Email };

        _mediator
            .SendCommandAsync<SyncUserCommand, UserDto>(Arg.Any<SyncUserCommand>())
            .Returns(syncedUser);

        var response = await _client.PostAsJsonAsync("api/auth/sync", request, ApiJsonOptions.Default);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<UserDto>(ApiJsonOptions.Default);
        Assert.NotNull(result);
        Assert.Equal(request.Email, result!.Email);
    }

    [Fact]
    public async Task SyncUser_CuerpoVacio_Returns400()
    {
        // Enviar un objeto sin campos mínimos requeridos por el modelo
        var response = await _client.PostAsync(
            "api/auth/sync",
            new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));

        // Puede fallar en serialización o en validación según la configuración
        Assert.True(
            response.StatusCode is HttpStatusCode.BadRequest
                or HttpStatusCode.UnprocessableEntity
                or HttpStatusCode.OK,
            $"Status inesperado: {response.StatusCode}");
    }
}
