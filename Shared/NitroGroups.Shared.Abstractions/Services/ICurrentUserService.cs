namespace NitroGroups.Shared.Abstractions.Services
{
    /// <summary>
    /// Identidad del usuario que hace la petición, siempre tomada del JWT validado.
    /// Ningún endpoint debe decidir "quién actúa" a partir del cuerpo de la petición.
    /// </summary>
    public interface ICurrentUserService
    {
        /// <summary>Id interno (users.users.id). Null si no está autenticado o aún no se sincronizó.</summary>
        long? GetUserId();

        /// <summary>Claim <c>sub</c> de Auth0 (p. ej. "auth0|abc123"). Null si no está autenticado.</summary>
        string? GetAuth0Id();

        /// <summary>Email del token, si Auth0 lo incluye.</summary>
        string? GetEmail();

        /// <summary>true si el token trae el rol de administrador de la plataforma.</summary>
        bool IsAdmin();
    }
}
