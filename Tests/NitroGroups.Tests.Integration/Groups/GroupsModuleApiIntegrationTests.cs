using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Core.Groups.Infrastructure.Adapters;
using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Groups;

public class GroupsModuleApiIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private const long OwnerId = 10;
    private const long ManagerId = 11;
    private const long MemberId = 12;
    private const long InactiveManagerId = 13;
    private const long StrangerId = 99;

    [Theory]
    [InlineData(OwnerId, true)]
    [InlineData(ManagerId, true)]
    [InlineData(MemberId, false)]
    [InlineData(InactiveManagerId, false)]
    [InlineData(StrangerId, false)]
    public async Task CanManageGroupAsync_SoloOwnerYManagerActivos(long userId, bool expected)
    {
        await using var context = fixture.CreateGroupsContext();
        var groupId = await SeedGroupAsync(context);
        var api = new GroupsModuleApi(context);

        var canManage = await api.CanManageGroupAsync(groupId, userId);

        Assert.Equal(expected, canManage);
    }

    [Fact]
    public async Task GetManagerUserIdsAsync_IncluyeOwnerYManagersActivos()
    {
        await using var context = fixture.CreateGroupsContext();
        var groupId = await SeedGroupAsync(context);
        var api = new GroupsModuleApi(context);

        var managers = await api.GetManagerUserIdsAsync(groupId);

        Assert.Equal([OwnerId, ManagerId], managers.Order());
    }

    private static async Task<long> SeedGroupAsync(Core.Groups.Infrastructure.Persistence.GroupsDbContext context)
    {
        var group = new Group { OwnerUserId = OwnerId, Slug = "los-test", GroupName = "Los Test", Active = true };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = ManagerId, Role = GroupMemberRole.Manager, IsActive = true },
            new GroupMember { GroupId = group.Id, UserId = MemberId, Role = GroupMemberRole.Member, IsActive = true },
            new GroupMember { GroupId = group.Id, UserId = InactiveManagerId, Role = GroupMemberRole.Manager, IsActive = false });
        await context.SaveChangesAsync();

        return group.Id;
    }
}
