using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using NitroGroups.UI.Blazor;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiUrl = builder.Configuration["services:nitrogroups-services-api:httpEndpoint"];

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(apiUrl!) });

await builder.Build().RunAsync();
