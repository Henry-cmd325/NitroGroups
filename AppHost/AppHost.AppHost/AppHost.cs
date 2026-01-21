using Microsoft.Extensions.Configuration;

var builder = DistributedApplication.CreateBuilder(args);

var authConfig = builder.Configuration.GetRequiredSection("Auth0");

var authority = authConfig["Authority"]
    ?? throw new InvalidOperationException("Auth0:Authority is not configured.");
var audience = authConfig["Audience"]
    ?? throw new InvalidOperationException("Auth0:Audience is not configured.");

var api = builder.AddProject<Projects.NitroGroups_Services_Api>("nitrogroups-services-api")
    // Double-underscore is the cross-platform way to represent nested configuration via environment variables.
    .WithEnvironment("Auth0__Authority", authority)
    .WithEnvironment("Auth0__Audience", audience)
    .WithHttpHealthCheck("/health");

var apiBaseUrl = api.GetEndpoint("https");

builder.AddJavaScriptApp("frontend", "../../UI/nitro-groups")
    .WithNpm(install: true, installArgs: ["--legacy-peer-deps"])
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithEnvironment("NEXT_PUBLIC_API_BASE_URL", apiBaseUrl)
    .WithReference(api);

builder.Build().Run();
