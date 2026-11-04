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

    private static NitroClaimsTransformation Create(IUsersModuleApi users, IMemoryCache? cache = null) =>
        new(users, cache ?? new MemoryCache(new MemoryCacheOptions()), new ConfigurationBuilder().Build());

    [Fact]
    public async Task AgregaElIdInternoCuandoElUsuarioEstaSincronizado()
    {
        var users = Substitute.For<IUsersModuleApi>();
        users.GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>()).Returns(42L);

        var principal = await Create(users).TransformAsync(Authenticated());

        Assert.Equal("42", principal.FindFirst(NitroClaimTypes.UserId)?.Value);
    }

    [Fact]
    public async Task UsuarioSinSincronizar_NoRecibeId_YElSyncInvalidaElCache()
    {
        var users = Substitute.For<IUsersModuleApi>();
        users.GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>()).Returns((long?)null);
        var cache = new MemoryCache(new MemoryCacheOptions());
        var transformation = Create(users, cache);

        var principal = await transformation.TransformAsync(Authenticated());
        Assert.Null(principal.FindFirst(NitroClaimTypes.UserId));

        // El "no existe" se cachea: una segunda petición no vuelve a consultar.
        await transformation.TransformAsync(Authenticated());
        await users.Received(1).GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>());

        // POST api/auth/sync crea el usuario e invalida la entrada.
        users.GetUserIdByAuth0IdAsync("auth0|abc", Arg.Any<CancellationToken>()).Returns(7L);
        cache.Remove(NitroClaimsTransformation.CacheKey("auth0|abc"));
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
