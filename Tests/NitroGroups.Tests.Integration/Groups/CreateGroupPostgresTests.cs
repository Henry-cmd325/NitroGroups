using Microsoft.EntityFrameworkCore;
using NitroGroups.Core.Groups.Application.UseCases.Groups.Create;
using NitroGroups.Core.Groups.Infrastructure.Persistence;
using NitroGroups.Shared.Domain.DomainEvents.Groups.Enums;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Groups;

/// <summary>
/// Crear un grupo contra PostgreSQL real, con las claves foráneas y los NOT NULL de verdad.
/// La base en memoria no los aplica, por eso el 500 del onboarding de manager no se veía.
/// </summary>
public class CreateGroupPostgresTests(IntegrationTestFixture fixture) : IClassFixture<IntegrationTestFixture>
{
    private static GroupsDbContext Context(string cs) =>
        new(new DbContextOptionsBuilder<GroupsDbContext>().UseNpgsql(cs).Options);

    [PostgresFact]
    public async Task CrearGrupoDesdeElOnboardingDeManager_GuardaElGrupoYAlDuenoComoMiembro()
    {
        await using var db = await PostgresTestDatabase.CreateAsync();
        await using (var ctx = Context(db.ConnectionString)) await ctx.Database.MigrateAsync();

        await using var context = Context(db.ConnectionString);
        var handler = new CreateGroupCommandHandler(fixture.CreateGroupsUnitOfWork(context), fixture.CreateMapper());

        // Lo mismo que manda src/app/onboarding/manager/page.tsx: sin teléfono ni biografía.
        var result = await handler.Handle(new CreateGroupCommand(
            OwnerUserId: 7,
            Slug: "mariachi-oro",
            GroupName: "Mariachi Oro",
            Description: "Mariachi para bodas",
            Biography: "",
            NumMembers: 1,
            YearsExperience: 0,
            Phone: "",
            Email: "manager@example.com",
            LocationText: "Guadalajara, Jalisco",
            ServiceRadiusKm: 50,
            Currency: "MXN",
            BasePrice: 18000m,
            HourlyRate: null,
            MinimumDurationHours: 2,
            SetupTimeMinutes: 30,
            IsAcceptingBookings: true,
            Active: true), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        var groupId = result.Value!.Id;
        Assert.True(groupId > 0);

        await using var check = Context(db.ConnectionString);
        var owner = await check.GroupMembers.SingleAsync(m => m.GroupId == groupId);
        Assert.Equal(7, owner.UserId);
        Assert.Equal(GroupMemberRole.Owner, owner.Role);
        Assert.True(owner.IsActive);
    }
}
