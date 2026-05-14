using NitroGroups.Core.Groups.Application.UseCases.Groups.Update;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Groups;

public class UpdateGroupCommandHandlerIntegrationTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public UpdateGroupCommandHandlerIntegrationTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_CuandoGrupoExiste_DeberiaActualizarYPersistir()
    {
        await using var context = _fixture.CreateContext();
        context.Groups.Add(new Group
        {
            OwnerUserId = 1,
            Slug = "old-slug",
            GroupName = "Old Name",
            Description = "Old",
            Biography = "Old bio",
            Active = true,
            IsAcceptingBookings = true,
            Currency = "MXN",
            Email = "old@example.com",
            Phone = "5550000000"
        });
        await context.SaveChangesAsync();
        var group = context.Groups.Single();

        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new UpdateGroupCommandHandler(unitOfWork, mapper);

        var command = new UpdateGroupCommand(
            group.Id,
            "new-slug",
            "New Name",
            "Desc",
            "Bio",
            5,
            10,
            "5551111111",
            "new@example.com",
            "CDMX",
            30,
            "USD",
            100m,
            10m,
            2,
            20,
            true,
            "https://cdn.test/profile.jpg",
            "https://cdn.test/cover.jpg");

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("new-slug", result.Value!.Slug);
        Assert.Equal("New Name", result.Value.GroupName);

        var persisted = await context.Groups.FindAsync(group.Id);
        Assert.NotNull(persisted);
        Assert.Equal("new-slug", persisted!.Slug);
        Assert.Equal("new@example.com", persisted.Email);
        Assert.Equal("https://cdn.test/profile.jpg", persisted.ProfilePictureUrl);
    }

    [Fact]
    public async Task Handle_CuandoGrupoNoExiste_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new UpdateGroupCommandHandler(unitOfWork, mapper);

        var result = await handler.Handle(new UpdateGroupCommand(
            999,
            "slug",
            "name",
            "desc",
            "bio",
            1,
            1,
            "555",
            "a@a.com",
            "loc",
            1,
            "MXN",
            null,
            null,
            1,
            1,
            true,
            null,
            null), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("Group not found.", result.Error);
    }
}
