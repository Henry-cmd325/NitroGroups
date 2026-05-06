using Auth0.AuthenticationApi;
using Auth0.AuthenticationApi.Models;
using Auth0.ManagementApi;
using Microsoft.Extensions.Options;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;
using NitroGroups.Shared.Infrastructure.Configuration;
using System.Dynamic;

namespace NitroGroups.Core.Users.Infrastructure.Services
{
    public class AuthenticationService : IAuthenticationService
    {
        private readonly Auth0ManagementApiSettings _settings;
        private string _accessToken = string.Empty;
        private DateTime _tokenExpiration;

        public AuthenticationService(IOptions<Auth0ManagementApiSettings> options)
        {
            _settings = options.Value;
        }

        private async Task<string> GetAccessToken()
        {
            if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiration)
            {
                return _accessToken;
            }

            var authClient = new AuthenticationApiClient(new Uri(_settings.Domain));

            var tokenRequest = new ClientCredentialsTokenRequest
            {
                ClientId = _settings.ClientId,
                ClientSecret = _settings.ClientSecret,
                Audience = _settings.Audience
            };

            var tokenResponse = await authClient.GetTokenAsync(tokenRequest);

            _accessToken = tokenResponse.AccessToken;
            _tokenExpiration = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn).AddMinutes(-1);

            return _accessToken;
        }

        public async Task ActualizarTipoUsuario(string auth0UserId, UserType userType)
        {
            var client = new ManagementApiClient(
                await GetAccessToken(),
                new ClientOptions
                {
                    BaseUrl = $"{_settings.Domain.TrimEnd('/')}/api/v2"
                });

            dynamic metadata = new ExpandoObject();
            metadata.user_type = userType;

            var updateRequest = new UpdateUserRequestContent
            {
                AppMetadata = metadata
            };

            await client.Users.UpdateAsync(auth0UserId, updateRequest);
        }
    }
}
