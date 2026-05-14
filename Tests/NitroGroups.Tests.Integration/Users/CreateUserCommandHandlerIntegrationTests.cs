using NitroGroups.Core.Users.Application.UseCases.Users.Create;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Users;

public class CreateUserCommandHandlerIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture = fixture;

    [Fact]
    public async Task Handle_DeberiaPersistirUsuarioYRetornarDto()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context);
        var handler = new CreateUserCommandHandler(unitOfWork, mapper);

        var command = new CreateUserCommand(
            Auth0Id: "auth0|integration-user",
            Email: "integration@example.com",
            FirstName: "Juan",
            LastName: "Pérez",
            UserType: UserType.Client);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal(command.Email, result.Email);
        Assert.Equal(command.Auth0Id, result.Auth0Id);
        Assert.Equal(command.FirstName, result.FirstName);
        Assert.Equal(command.LastName, result.LastName);
        Assert.Equal(command.UserType, result.UserType);

        var persistedUser = await context.Users.FindAsync((long)result.Id);
        Assert.NotNull(persistedUser);
        Assert.Equal(command.Email, persistedUser!.Email);
        Assert.Equal(command.Auth0Id, persistedUser.Auth0Id);
        Assert.Equal(command.FirstName, persistedUser.FirstName);
        Assert.Equal(command.LastName, persistedUser.LastName);
        Assert.Equal(command.UserType, persistedUser.UserType);
        Assert.True(persistedUser.Active);
    }

    [Fact]
    public async Task Handle_DeberiaPersistirMultiplesUsuariosEnLaMismaBaseDePrueba()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context);
        var handler = new CreateUserCommandHandler(unitOfWork, mapper);

        await handler.Handle(new CreateUserCommand("auth0|u1", "u1@example.com", "A", "Uno", UserType.Client), CancellationToken.None);
        await handler.Handle(new CreateUserCommand("auth0|u2", "u2@example.com", "B", "Dos", UserType.Musician), CancellationToken.None);

        Assert.Equal(2, context.Users.Count());

        User? secondUser = context.Users.SingleOrDefault(x => x.Auth0Id == "auth0|u2");
        Assert.NotNull(secondUser);
        Assert.Equal(UserType.Musician, secondUser!.UserType);
    }
}
