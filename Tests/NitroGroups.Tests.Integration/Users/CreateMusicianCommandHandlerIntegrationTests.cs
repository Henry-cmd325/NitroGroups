using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Application.UseCases.Musicians.Create;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.Contracts.Modules;
using NitroGroups.Shared.Contracts.Users.Requests;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NitroGroups.Tests.Integration.Infrastructure;
using NSubstitute;

namespace NitroGroups.Tests.Integration.Users;

public class CreateMusicianCommandHandlerIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture = fixture;

    [Fact]
    public async Task Handle_CuandoExisteUsuario_DeberiaCrearPerfilMusicianYActualizarTipo()
    {
        await using var context = _fixture.CreateUsersContext();
        var existingUser = new User("auth0|musician-existing", "existing@example.com", "Laura", "Gómez", UserType.Client);
        context.Users.Add(existingUser);
        await context.SaveChangesAsync();

        var mapper = _fixture.CreateMapper();
        var outbox = Substitute.For<IOutboxService>();
        var groupsModule = Substitute.For<IGroupsModuleApi>();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context, outbox);
        var authService = Substitute.For<IAuthenticationService>();
        var handler = new CreateMusicianCommandHandler(unitOfWork, authService, groupsModule, mapper);

        var command = new CreateMusicianCommand(
            new UserInfoData
            {
                Auth0Id = existingUser.Auth0Id,
                Email = existingUser.Email,
                FirstName = existingUser.FirstName,
                LastName = existingUser.LastName,
                UserType = UserType.Musician,
                Origin = Origin.SignUp
            },
            new MusicianProfileData
            {
                ShortBio = "Bajista",
                YearsExperience = 7,
                IsOpenToJoin = true,
                CreateGroup = false
            },
            IdGroup: 0);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(7, result.Value!.YearsExperience);

        User persistedUser = context.Users.Single(x => x.Id == existingUser.Id);
        Assert.Equal(UserType.Musician, persistedUser.UserType);

        Musician? persistedMusician = context.Set<Musician>().SingleOrDefault(x => x.UserId == existingUser.Id);
        Assert.NotNull(persistedMusician);
        Assert.Equal("Bajista", persistedMusician!.ShortBio);
        Assert.True(persistedMusician.IsOpenToJoin);

        await authService.Received(1).ActualizarTipoUsuario(existingUser.Auth0Id, UserType.BandMember);
    }

    [Fact]
    public async Task Handle_CuandoIdGroupNoExiste_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateUsersContext();
        var mapper = _fixture.CreateMapper();
        var outbox = Substitute.For<IOutboxService>();
        var groupsModule = Substitute.For<IGroupsModuleApi>();
        groupsModule.GroupExistsAsync(123, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context, outbox);
        var authService = Substitute.For<IAuthenticationService>();
        var handler = new CreateMusicianCommandHandler(unitOfWork, authService, groupsModule, mapper);

        var command = new CreateMusicianCommand(
            new UserInfoData
            {
                Auth0Id = "auth0|new-musician",
                Email = "new-musician@example.com",
                FirstName = "Pedro",
                LastName = "Luna",
                UserType = UserType.Musician,
                Origin = Origin.SignUp
            },
            new MusicianProfileData
            {
                ShortBio = "Baterista",
                YearsExperience = 3,
                IsOpenToJoin = false,
                CreateGroup = false
            },
            IdGroup: 123);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("El grupo al que se queria unir ya no existe", result.Error);

        Assert.Equal(1, context.Users.Count());
        Assert.Equal(1, context.Set<Musician>().Count());
        await outbox.DidNotReceive().SaveEventsAsync(Arg.Any<IEnumerable<NitroGroups.Shared.Domain.IDomainEvent>>());
    }
}
