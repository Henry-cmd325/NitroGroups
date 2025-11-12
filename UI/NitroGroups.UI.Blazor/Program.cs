using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using NitroGroups.UI.Blazor;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

// 1. Configura el servicio de autenticación OIDC
builder.Services.AddOidcAuthentication(options =>
{
    // Carga la configuración desde appsettings.json
    options.ProviderOptions.Authority = builder.Configuration["services:nitrogroups-services-api:Auth0:Authority"];
    options.ProviderOptions.ClientId = builder.Configuration["services:nitrogroups-services-api:Auth0:ClientId"];

    // Auth0 usa el estándar OIDC, así que "code" es el flujo correcto (PKCE)
    options.ProviderOptions.ResponseType = "code";

    // 2. ¡Esta es la línea MÁGICA!
    // Le dice a Auth0: "Cuando el usuario inicie sesión, dame también un
    // Access Token que sea válido para esta API (Audience)".
    options.ProviderOptions.AdditionalProviderParameters.Add("audience", builder.Configuration["services:nitrogroups-services-api:Auth0:Audience"]!);

    // 3. Pide los permisos (scopes) básicos
    options.ProviderOptions.DefaultScopes.Add("openid");
    options.ProviderOptions.DefaultScopes.Add("profile");
    options.ProviderOptions.DefaultScopes.Add("email");
});

builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiUrl = builder.Configuration["services:nitrogroups-services-api:httpEndpoint"];

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(apiUrl!) });

await builder.Build().RunAsync();
