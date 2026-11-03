namespace NitroGroups.Shared.Abstractions.Services
{
    public static class NitroClaimTypes
    {
        /// <summary>Id interno del usuario; lo agrega la transformación de claims del módulo Users.</summary>
        public const string UserId = "nitro:user_id";

        /// <summary>Rol de Auth0 que identifica al administrador de la plataforma.</summary>
        public const string AdminRole = "admin";

        /// <summary>Política de autorización para endpoints de administración.</summary>
        public const string AdminPolicy = "Admin";
    }
}
