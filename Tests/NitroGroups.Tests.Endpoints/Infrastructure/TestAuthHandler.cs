using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace NitroGroups.Tests.Endpoints.Infrastructure;

/// <summary>
/// Esquema de autenticación de prueba que aprueba cualquier petición
/// y simula un usuario autenticado. Permite testear endpoints protegidos
/// sin necesidad de un token JWT real.
/// </summary>
public class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "TestScheme";

    /// <summary>Id interno del usuario de test (claim nitro:user_id).</summary>
    public const long UserId = 1;

    /// <summary>Header para simular una petición sin token.</summary>
    public const string AnonymousHeader = "X-Test-Anonymous";

    /// <summary>Header para simular un usuario autenticado que aún no se sincronizó (sin id interno).</summary>
    public const string UnregisteredHeader = "X-Test-Unregistered";

    /// <summary>Header para agregar el rol admin.</summary>
    public const string AdminHeader = "X-Test-Admin";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (Request.Headers.ContainsKey(AnonymousHeader))
            return Task.FromResult(AuthenticateResult.NoResult());

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "auth0|test-user-id"),
            new(ClaimTypes.Email, "test@example.com"),
            new("sub", "auth0|test-user-id")
        };
        if (!Request.Headers.ContainsKey(UnregisteredHeader))
            claims.Add(new Claim(NitroGroups.Shared.Abstractions.Services.NitroClaimTypes.UserId, UserId.ToString()));
        if (Request.Headers.ContainsKey(AdminHeader))
            claims.Add(new Claim(ClaimTypes.Role, NitroGroups.Shared.Abstractions.Services.NitroClaimTypes.AdminRole));

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
