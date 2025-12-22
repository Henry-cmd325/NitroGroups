using Auth0.ManagementApi;
using Auth0.ManagementApi.Models;
using System.Dynamic;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class AuthenticationService
    {
        public async Task ActualizarPermisosUsuario(string auth0UserId, string tipoUsuario, string rolAdmin)
        {
            var client = new ManagementApiClient("cgr_wDRUYmGngG5oH1jZ", new Uri("https://api-nitrogroups"));

            // 2. Definir los datos que quieres guardar en app_metadata
            // Usamos ExpandoObject para crear un JSON dinámico
            dynamic metadata = new ExpandoObject();
            metadata.user_type = tipoUsuario;
            metadata.admin_role = rolAdmin;

            // 3. Crear la solicitud de actualización
            var updateRequest = new UserUpdateRequest
            {
                AppMetadata = metadata
            };

            // 4. Ejecutar la actualización en Auth0
            await client.Users.UpdateAsync(auth0UserId, updateRequest);
        }
    }
}
