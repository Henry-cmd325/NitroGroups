using NitroGroups.Core.Groups.Application.UseCases.Groups.CheckSlugAvailability;
using NitroGroups.Core.Groups.Domain.Entities;
using NitroGroups.Tests.Integration.Infrastructure;

namespace NitroGroups.Tests.Integration.Groups;

public class CheckSlugAvailabilityQueryHandlerIntegrationTests : IClassFixture<IntegrationTestFixture>
{
    private readonly IntegrationTestFixture _fixture;

    public CheckSlugAvailabilityQueryHandlerIntegrationTests(IntegrationTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Handle_CuandoNoExisteSlug_DeberiaRetornarDisponible()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new CheckSlugAvailabilityQueryHandler(unitOfWork);

        var result = await handler.Handle(new CheckSlugAvailabilityQuery("slug-libre"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value);
    }

    [Fact]
    public async Task Handle_CuandoExisteSlug_DeberiaRetornarNoDisponible()
    {
        await using var context = _fixture.CreateContext();
        context.Groups.Add(new Group
        {
            OwnerUserId = 1,
            Slug = "slug-ocupado",
            GroupName = "Grupo",
            Active = true,
            IsAcceptingBookings = true,
            Currency = "MXN",
            Email = "grupo@example.com",
            Phone = "5550001111"
        });
        await context.SaveChangesAsync();

        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new CheckSlugAvailabilityQueryHandler(unitOfWork);

        var result = await handler.Handle(new CheckSlugAvailabilityQuery("slug-ocupado"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value);
    }

    [Fact]
    public async Task Handle_CuandoSlugEstaVacio_DeberiaRetornarFailure()
    {
        await using var context = _fixture.CreateContext();
        var unitOfWork = _fixture.CreateGroupsUnitOfWork(context);
        var handler = new CheckSlugAvailabilityQueryHandler(unitOfWork);

        var result = await handler.Handle(new CheckSlugAvailabilityQuery("   "), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("Slug cannot be empty.", result.Error);
    }
}
