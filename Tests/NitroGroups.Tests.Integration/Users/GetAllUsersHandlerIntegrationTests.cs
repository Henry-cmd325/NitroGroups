using NitroGroups.Core.Users.Application.UseCases.Users.GetAll;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Users;

public class GetAllUsersHandlerIntegrationTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public GetAllUsersHandlerIntegrationTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_DeberiaRetornarUsuariosPaginados()
    {
        await using var context = _fixture.CreateContext();
        context.Users.AddRange(
            new User("auth0|u1", "u1@example.com", "A", "Uno", UserType.Client),
            new User("auth0|u2", "u2@example.com", "B", "Dos", UserType.Musician),
            new User("auth0|u3", "u3@example.com", "C", "Tres", UserType.Client));
        await context.SaveChangesAsync();

        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context);
        var handler = new GetAllUsersHandler(unitOfWork, mapper);

        var result = await handler.Handle(new GetAllUsersQuery { Page = 1, Size = 2 }, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(3, result.TotalCount);
        Assert.Equal(1, result.PageNumber);
        Assert.Equal(2, result.PageSize);
        Assert.True(result.HasNextPage);
    }

    [Fact]
    public async Task Handle_EnPaginaPosterior_DeberiaRetornarElementosEsperados()
    {
        await using var context = _fixture.CreateContext();
        context.Users.AddRange(
            new User("auth0|u1", "u1@example.com", "A", "Uno", UserType.Client),
            new User("auth0|u2", "u2@example.com", "B", "Dos", UserType.Musician),
            new User("auth0|u3", "u3@example.com", "C", "Tres", UserType.Client));
        await context.SaveChangesAsync();

        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateUsersUnitOfWork(context);
        var handler = new GetAllUsersHandler(unitOfWork, mapper);

        var result = await handler.Handle(new GetAllUsersQuery { Page = 2, Size = 2 }, CancellationToken.None);

        Assert.Single(result.Items);
        Assert.Equal(2, result.PageNumber);
        Assert.True(result.HasPreviousPage);
        Assert.False(result.HasNextPage);
    }
}
