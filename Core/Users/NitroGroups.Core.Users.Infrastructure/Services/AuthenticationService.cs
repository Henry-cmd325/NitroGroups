using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using Auth0.ManagementApi.Models;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Domain.Entities;
using System.Dynamic;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class AuthenticationService : IAuthenticationService
    {
        private string _accessToken = string.Empty;
        private DateTime _tokenExpiration;

        private async Task<string> GetAccessToken()
        {
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiration)
            {
                return _accessToken;
            }

            var authClient = new AuthenticationApiClient(new Uri("https://dev-devalion.us.auth0.com/"));

            var tokenRequest = new ClientCredentialsTokenRequest
            {
                ClientId = "58wpDJ9tnUdBknOZTV4HnxgFGvGy80TA",
                ClientSecret = "4047x4HLJekKxjuUBIxNRilMATQxtQb7mdxAU3WSqascuupyV3ME-By3LIrNKnzB",
                Audience = "https://dev-devalion.us.auth0.com/api/v2/"
            };

            var tokenResponse = await authClient.GetTokenAsync(tokenRequest);
            
            _accessToken = tokenResponse.AccessToken;
            _tokenExpiration = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn).AddMinutes(-1);

            return _accessToken;
        }

        public async Task ActualizarTipoUsuario(string auth0UserId, UserType userType)
        {
            var client = new ManagementApiClient(await GetAccessToken(), new Uri("https://dev-devalion.us.auth0.com/api/v2/"));

            dynamic metadata = new ExpandoObject();
            metadata.user_type = userType;

            var updateRequest = new UserUpdateRequest
            {
                AppMetadata = metadata
            };

            await client.Users.UpdateAsync(auth0UserId, updateRequest);
        }
    }
}
