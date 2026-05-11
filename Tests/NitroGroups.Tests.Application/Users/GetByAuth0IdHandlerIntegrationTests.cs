using NitroGroups.Core.Users.Application.UseCases.Users.GetByAuth0Id;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Users;

public class GetByAuth0IdHandlerIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture = fixture;

    [Fact]
    public async Task Handle_CuandoExiste_DeberiaRetornarUsuario()
    {
        await using var context = _fixture.CreateContext();
        var user = new User("auth0|lookup", "lookup@example.com", "Marco", "Díaz", UserType.Client);
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context);
        var handler = new GetByAuth0IdHandler(unitOfWork, mapper);

        var result = await handler.Handle(new GetByAuth0IdQuery("auth0|lookup"), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("auth0|lookup", result!.Auth0Id);
        Assert.Equal("lookup@example.com", result.Email);
    }

    [Fact]
    public async Task Handle_CuandoNoExiste_DeberiaRetornarNull()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context);
        var handler = new GetByAuth0IdHandler(unitOfWork, mapper);

        var result = await handler.Handle(new GetByAuth0IdQuery("auth0|missing"), CancellationToken.None);

        Assert.Null(result);
    }
}
