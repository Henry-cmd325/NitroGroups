using NitroGroups.Core.Users.Application.UseCases.Users.Sync;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Users;

public class SyncUserCommandHandlerIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture = fixture;

    [Fact]
    public async Task Handle_CuandoUsuarioNoExiste_DeberiaCrearloConProfilePicture()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context);
        var handler = new SyncUserCommandHandler(unitOfWork, mapper);

        var command = new SyncUserCommand(
            Auth0Id: "auth0|sync-new",
            Email: "sync-new@example.com",
            FirstName: "Ana",
            LastName: "López",
            UserType: UserType.Musician,
            ProfilePictureUrl: "https://cdn.test/profile.png",
            Origin: "signup");

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.Equal(command.Auth0Id, result.Auth0Id);
        Assert.Equal(command.Email, result.Email);
        Assert.Equal(command.ProfilePictureUrl, result.ProfilePictureUrl);

        User? persisted = context.Users.SingleOrDefault(x => x.Auth0Id == command.Auth0Id);
        Assert.NotNull(persisted);
        Assert.Equal(command.Email, persisted!.Email);
        Assert.Equal(command.ProfilePictureUrl, persisted.ProfilePictureUrl);
        Assert.Null(persisted.LastLoginAt);
    }

    [Fact]
    public async Task Handle_CuandoUsuarioExiste_DeberiaActualizarLastLoginYSinDuplicar()
    {
        await using var context = _fixture.CreateContext();
        var existingUser = new User("auth0|sync-existing", "existing@example.com", "Luis", "Ramírez", UserType.Client);
        context.Users.Add(existingUser);
        await context.SaveChangesAsync();

        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context);
        var handler = new SyncUserCommandHandler(unitOfWork, mapper);

        var command = new SyncUserCommand(
            Auth0Id: existingUser.Auth0Id,
            Email: "otro@example.com",
            FirstName: "Otro",
            LastName: "Nombre",
            UserType: UserType.Musician,
            ProfilePictureUrl: null,
            Origin: "login");

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.Equal(existingUser.Auth0Id, result.Auth0Id);
        Assert.Equal(1, context.Users.Count());

        User persisted = context.Users.Single(x => x.Auth0Id == existingUser.Auth0Id);
        Assert.NotNull(persisted.LastLoginAt);
        Assert.Equal("existing@example.com", persisted.Email);
    }
}
