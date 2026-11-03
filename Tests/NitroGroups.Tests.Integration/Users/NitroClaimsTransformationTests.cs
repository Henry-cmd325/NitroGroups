using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using NitroGroups.Core.Users.Infrastructure.Auth;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Contracts.Modules;
using NSubstitute;
using System.Security.Claims;

namespace NitroGroups.Tests.Integration.Users;

public class NitroClaimsTransformationTests
{
    private static ClaimsPrincipal Authenticated(params Claim[] claims) =>
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "auth0|abc"), .. claims], "jwt"));

    private static NitroClaimsTransformation Create(IUsersModuleApi users) =>
        new(users, new MemoryCache(new MemoryCacheOptions()), new ConfigurationBuilder().Build());

    [Fact]
    public async Task AgregaElIdInternoCuandoElUsuarioEstaSincronizado()
    {
        var users = Substitute.For<IUsersModuleApi>();
        users.GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>()).Returns(42L);

        var principal = await Create(users).TransformAsync(Authenticated());

        Assert.Equal("42", principal.FindFirst(NitroClaimTypes.UserId)?.Value);
    }

    [Fact]
    public async Task NoAgregaIdSiElUsuarioNoExiste_NiCacheaElFaltante()
    {
        var users = Substitute.For<IUsersModuleApi>();
        users.GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>()).Returns((long?)null);
        var transformation = Create(users);

        var principal = await transformation.TransformAsync(Authenticated());
        Assert.Null(principal.FindFirst(NitroClaimTypes.UserId));

        // Se sincroniza: como el faltante no se cacheó, la petición siguiente ya ve el id.
        users.GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>()).Returns(7L);
        principal = await transformation.TransformAsync(Authenticated());
        Assert.Equal("7", principal.FindFirst(NitroClaimTypes.UserId)?.Value);
    }

    [Fact]
    public async Task CacheaElIdEncontrado()
    {
        var users = Substitute.For<IUsersModuleApi>();
        users.GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>()).Returns(42L);
        var transformation = Create(users);

        await transformation.TransformAsync(Authenticated());
        await transformation.TransformAsync(Authenticated());

        await users.Received(1).GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task MapeaElRolAdminDeAuth0()
    {
        var users = Substitute.For<IUsersModuleApi>();

        var principal = await Create(users).TransformAsync(
            Authenticated(new Claim(NitroClaimsTransformation.DefaultRolesClaim, NitroClaimTypes.AdminRole)));

        Assert.True(principal.IsInRole(NitroClaimTypes.AdminRole));
    }

    [Fact]
    public async Task NoTocaPrincipalesAnonimos()
    {
        var users = Substitute.For<IUsersModuleApi>();
        var anonymous = new ClaimsPrincipal(new ClaimsIdentity());

        var principal = await Create(users).TransformAsync(anonymous);

        Assert.Empty(principal.Claims);
        await users.DidNotReceiveWithAnyArgs().GetUserIdByAuth0IdAsync(default!, default);
    }
}
