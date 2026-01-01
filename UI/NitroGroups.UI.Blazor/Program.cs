using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Authentication;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using NitroGroups.UI.Blazor;
using NitroGroups.UI.Blazor.Services.User;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

builder.Services.AddOidcAuthentication(options =>
{
    options.ProviderOptions.Authority = builder.Configuration["Auth0:Authority"];
    options.ProviderOptions.ClientId = builder.Configuration["Auth0:ClientId"];

    options.ProviderOptions.ResponseType = "code";

    options.ProviderOptions.DefaultScopes.Add("openid");
    options.ProviderOptions.DefaultScopes.Add("profile");
    options.ProviderOptions.DefaultScopes.Add("email");

    options.ProviderOptions.AdditionalProviderParameters.Add("audience", builder.Configuration["Auth0:Audience"]!);
});

builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiUrl = builder.Configuration["ApiUrl"]!;

builder.Services.AddTransient(sp =>
{
    var handler = new AuthorizationMessageHandler(
        sp.GetRequiredService<IAccessTokenProvider>(),
        sp.GetRequiredService<NavigationManager>()
    );

    // Aquí le decimos qué URLs requieren el token de Auth0
    handler.ConfigureHandler(
        authorizedUrls: [apiUrl]
    );

    return handler;
});

builder.Services.AddHttpClient<IUserService, UserService>(client =>
{
    client.BaseAddress = new Uri(apiUrl);
})
.AddHttpMessageHandler<AuthorizationMessageHandler>();

await builder.Build().RunAsync();

