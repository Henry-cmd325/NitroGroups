var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.NitroGroups_Services_Api>("nitrogroups-services-api")
    .WithHttpHealthCheck("/health");

builder.AddProject<Projects.NitroGroups_UI_Blazor>("nitrogroups-ui-blazor")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(apiService)
    .WaitFor(apiService);

builder.Build().Run();
