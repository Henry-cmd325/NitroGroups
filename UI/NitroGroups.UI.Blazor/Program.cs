using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using NitroGroups.UI.Blazor;

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

var apiUrl = builder.Configuration["services:nitrogroups-services-api:httpEndpoint"];

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(apiUrl!) });

await builder.Build().RunAsync();