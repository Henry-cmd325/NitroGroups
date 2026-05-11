using NitroGroups.Core.Groups.Application.UseCases.Groups.GetMembersRoleByIdGroup;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Groups;

public class GetMembersRoleByIdGroupQueryHandlerIntegrationTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public GetMembersRoleByIdGroupQueryHandlerIntegrationTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_CuandoExistenMiembros_DeberiaRetornarLista()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new GetMembersRoleByIdGroupQueryHandler(unitOfWork, mapper);

        context.GroupMembers.AddRange(
            new GroupMember
            {
                GroupId = 10,
                UserId = 1,
                Role = GroupMemberRole.Leader,
                IsActive = true,
                JoinedAt = DateTime.UtcNow,
                JoinedVia = JoinedVia.Manual
            },
            new GroupMember
            {
                GroupId = 10,
                UserId = 2,
                Role = GroupMemberRole.Member,
                IsActive = true,
                JoinedAt = DateTime.UtcNow,
                JoinedVia = JoinedVia.Manual
            });
        await context.SaveChangesAsync();

        var result = await handler.Handle(new GetMembersRoleByIdGroupQuery(10), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Count);
        Assert.Contains(result.Value, x => x.UserId == 1 && x.Role == GroupMemberRole.Leader);
        Assert.Contains(result.Value, x => x.UserId == 2 && x.Role == GroupMemberRole.Member);
    }

    [Fact]
    public async Task Handle_CuandoNoExistenMiembros_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new GetMembersRoleByIdGroupQueryHandler(unitOfWork, mapper);

        var result = await handler.Handle(new GetMembersRoleByIdGroupQuery(404), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("No se encontraron miembros para el grupo", result.Error);
    }
}
