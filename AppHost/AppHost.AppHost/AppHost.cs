var builder = DistributedApplication.CreateBuilder(args);

var authConfig = builder.Configuration.GetSection("Auth0");

var apiService = builder.AddProject<Projects.NitroGroups_Services_Api>("nitrogroups-services-api")
    .WithEnvironment("Auth0:Authority", authConfig["Authority"])
    .WithEnvironment("Auth0:Audience", authConfig["Audience"])
    .WithHttpHealthCheck("/health");

builder.AddProject<Projects.NitroGroups_UI_Blazor>("nitrogroups-ui-blazor")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(apiService)
    .WithEnvironment("Auth0:Authority", authConfig["Authority"])
    .WithEnvironment("Auth0:ClientId", authConfig["ClientId"])
    .WithEnvironment("Auth0:Audience", authConfig["Audience"])
    .WaitFor(apiService);

builder.Build().Run();
