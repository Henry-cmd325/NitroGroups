using NitroGroups.Core.Groups.Application.UseCases.Groups.Create;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Groups;

public class CreateGroupCommandHandlerIntegrationTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture = fixture;

    [Fact]
    public async Task Handle_CuandoSlugNoExiste_DeberiaCrearGrupoYMiembroLider()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new CreateGroupCommandHandler(unitOfWork, mapper);

        var command = new CreateGroupCommand(
            OwnerUserId: 10,
            Slug: "los-rockers",
            GroupName: "Los Rockers",
            Description: "Grupo de rock",
            Biography: "Bio",
            NumMembers: 4,
            YearsExperience: 6,
            Phone: "5551234567",
            Email: "band@example.com",
            LocationText: "Monterrey",
            ServiceRadiusKm: 50,
            Currency: "MXN",
            BasePrice: 2500m,
            HourlyRate: 1200m,
            MinimumDurationHours: 2,
            SetupTimeMinutes: 30,
            IsAcceptingBookings: true,
            Active: true);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.True(result.Value!.Id > 0);
        Assert.Equal(command.Slug, result.Value.Slug);
        Assert.Equal(command.GroupName, result.Value.GroupName);
        Assert.False(result.Value.IsVerified);
        Assert.False(result.Value.IsFeatured);
        Assert.Equal(0, result.Value.TotalReviews);
        Assert.Equal(0, result.Value.ViewCount);
        Assert.Equal(0, result.Value.BookingCount);

        Group? persistedGroup = await context.Groups.FindAsync(result.Value.Id);
        Assert.NotNull(persistedGroup);
        Assert.Equal(command.OwnerUserId, persistedGroup!.OwnerUserId);
        Assert.Equal(command.Slug, persistedGroup.Slug);
        Assert.Equal(command.GroupName, persistedGroup.GroupName);

        GroupMember? leader = context.GroupMembers.SingleOrDefault(x => x.GroupId == persistedGroup.Id && x.UserId == command.OwnerUserId);
        Assert.NotNull(leader);
        Assert.Equal(GroupMemberRole.Leader, leader!.Role);
        Assert.True(leader.IsActive);
        Assert.Equal(JoinedVia.Manual, leader.JoinedVia);
    }

    [Fact]
    public async Task Handle_CuandoSlugYaExiste_DeberiaRetornarFailureYSinCrearNuevoGrupo()
    {
        await using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new CreateGroupCommandHandler(unitOfWork, mapper);

        context.Groups.Add(new Group
        {
            OwnerUserId = 1,
            Slug = "duplicado",
            GroupName = "Existente",
            Active = true,
            IsAcceptingBookings = true,
            Currency = "MXN",
            Email = "existente@example.com",
            Phone = "5550000000"
        });
        await context.SaveChangesAsync();

        var command = new CreateGroupCommand(
            OwnerUserId: 22,
            Slug: "duplicado",
            GroupName: "Otro",
            Description: string.Empty,
            Biography: string.Empty,
            NumMembers: 1,
            YearsExperience: 1,
            Phone: "5551111111",
            Email: "otro@example.com",
            LocationText: string.Empty,
            ServiceRadiusKm: 10,
            Currency: "MXN",
            BasePrice: null,
            HourlyRate: null,
            MinimumDurationHours: 1,
            SetupTimeMinutes: 10,
            IsAcceptingBookings: true,
            Active: true);

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("Ya existe un grupo con este nombre/slug.", result.Error);
        Assert.Equal(1, context.Groups.Count());
        Assert.Empty(context.GroupMembers.Where(x => x.UserId == command.OwnerUserId));
    }
}
