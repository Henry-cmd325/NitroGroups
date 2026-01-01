
namespace NitroGroups.UI.Blazor.Services.User
{
    public class UserService(HttpClient httpClient) : IUserService
    {
        private readonly HttpClient _httpClient = httpClient;
        public async Task<string> Prueba()
        {
            return await _httpClient.GetStringAsync("api/prueba");
        }
    }
}
