using NitroGroups.Core.Groups.Application.UseCases.Groups.GetByUserId;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Groups;

public class GetGroupByUserIdQueryHandlerIntegrationTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public GetGroupByUserIdQueryHandlerIntegrationTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_CuandoExisteGrupoDelUsuario_DeberiaRetornarlo()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var handler = new GetGroupByUserIdQueryHandler(context, mapper);

        var group = new Group
        {
            OwnerUserId = 25,
            Slug = "grupo-del-usuario",
            GroupName = "Grupo del Usuario",
            Active = true,
            IsAcceptingBookings = true,
            Currency = "MXN",
            Email = "grupo@example.com",
            Phone = "5559990000"
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = 25,
            Role = GroupMemberRole.Leader,
            IsActive = true,
            JoinedAt = DateTime.UtcNow,
            JoinedVia = JoinedVia.Manual
        });
        await context.SaveChangesAsync();

        var result = await handler.Handle(new GetGroupByUserIdQuery(25), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal("grupo-del-usuario", result.Value!.Slug);
    }

    [Fact]
    public async Task Handle_CuandoNoExisteGrupoDelUsuario_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var handler = new GetGroupByUserIdQueryHandler(context, mapper);

        var result = await handler.Handle(new GetGroupByUserIdQuery(999), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("No se encontro ningun grupo que perteneciera al usuario", result.Error);
    }
}
