using Microsoft.AspNetCore.Http;
using NitroGroups.Shared.Abstractions.Services;
using NitroGroups.Shared.Infrastructure.Services;
using System.Security.Claims;

namespace NitroGroups.Tests.Integration.Users;

public class CurrentUserServiceTests
{
    private static CurrentUserService For(params Claim[] claims) =>
        new(new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "jwt")) }
        });

    [Fact]
    public void GetEmail_PrefiereElClaimConNamespaceDeAuth0()
    {
        var service = For(
            new Claim(NitroClaimTypes.Auth0EmailClaim, "verificado@example.com"),
            new Claim(ClaimTypes.Email, "otro@example.com"));

        Assert.Equal("verificado@example.com", service.GetEmail());
    }

    [Fact]
    public void GetEmail_SinClaimConNamespace_UsaElClaimEstandar()
    {
        Assert.Equal("std@example.com", For(new Claim("email", "std@example.com")).GetEmail());
    }

    [Fact]
    public void GetEmail_SinNingunClaim_DevuelveNull()
    {
        Assert.Null(For().GetEmail());
    }

    [Fact]
    public void GetUserId_LeeSoloElClaimInterno()
    {
        var service = For(new Claim(ClaimTypes.NameIdentifier, "123"), new Claim(NitroClaimTypes.UserId, "42"));

        Assert.Equal(42, service.GetUserId());
    }
}
