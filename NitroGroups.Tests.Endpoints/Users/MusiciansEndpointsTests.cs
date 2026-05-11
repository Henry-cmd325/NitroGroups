using System.Net;
using System.Net.Http.Json;
using Cortex.Mediator;
using NitroGroups.Core.Users.Application.UseCases.Musicians.Create;
using NitroGroups.Shared.Contracts;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Contracts.Users.Responses;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NSubstitute;
using NitroGroups.Tests.Endpoints.Infrastructure;

namespace NitroGroups.Tests.Endpoints.Users;

public class MusiciansEndpointsTests(NitroGroupsWebAppFactory factory) : IClassFixture<NitroGroupsWebAppFactory>
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly IMediator _mediator = factory.Mediator;

    private static CreateMusicianRequest BuildValidRequest() => new()
    {
        UserInfo = new UserInfoData
        {
            Auth0Id = "auth0|musician1",
            Email = "musician@example.com",
            FirstName = "Carlos",
            LastName = "Ruiz",
            UserType = UserType.Musician,
            Origin = Origin.SignUp
        },
        MusicianProfile = new MusicianProfileData
        {
            ShortBio = "Guitarrista profesional",
            YearsExperience = 5,
            IsOpenToJoin = true,
            CreateGroup = false
        },
        IdGroup = 0
    };

    // ---------------------------------------------------------------
    // POST api/musicians
    // ---------------------------------------------------------------

    [Fact]
    public async Task CreateMusician_ValidRequest_Returns201()
    {
        var created = new MusicianDto { Id = 1, UserId = 2, YearsExperience = 5 };

        _mediator
            .SendCommandAsync<CreateMusicianCommand, Result<MusicianDto>>(Arg.Any<CreateMusicianCommand>())
            .Returns(Result<MusicianDto>.Success(created));

        var response = await _client.PostAsJsonAsync("api/musicians", BuildValidRequest(), ApiJsonOptions.Default);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<MusicianDto>(ApiJsonOptions.Default);
        Assert.NotNull(result);
        Assert.Equal(created.YearsExperience, result!.YearsExperience);
    }

    [Fact]
    public async Task CreateMusician_ComandoFalla_Returns400()
    {
        _mediator
            .SendCommandAsync<CreateMusicianCommand, Result<MusicianDto>>(Arg.Any<CreateMusicianCommand>())
            .Returns(Result<MusicianDto>.Failure("El músico ya existe."));

        var response = await _client.PostAsJsonAsync("api/musicians", BuildValidRequest(), ApiJsonOptions.Default);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
