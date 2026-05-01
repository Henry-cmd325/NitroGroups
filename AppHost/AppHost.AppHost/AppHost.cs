using Aspire.Hosting;
using Microsoft.Extensions.Configuration;

// ProjectDirectory explícito: DCP/diagnósticos de VS resuelven mejor rutas y recursos (Aspire).
// En Windows + depurador, abrir el dashboard en el navegador predeterminado y usar el diálogo
// de archivos en Chrome/Brave puede tumbar el AppHost (-1); por eso launchBrowser=false en
// launchSettings y un perfil opcional que vuelve a abrir el dashboard.
var appHostProjectDir = FindDirectoryContainingFile(AppContext.BaseDirectory, "NitroGroups.AppHost.csproj")
    ?? throw new InvalidOperationException(
        "No se encontró NitroGroups.AppHost.csproj; ejecuta desde la solución NitroGroups.");
var builder = DistributedApplication.CreateBuilder(new DistributedApplicationOptions
{
    Args = args,
    ProjectDirectory = appHostProjectDir,
});

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

var uiRoot = GetNitroGroupsUiPath();
var npm = OperatingSystem.IsWindows() ? "npm.cmd" : "npm";
builder.AddExecutable("frontend", npm, uiRoot, "run", "dev")
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithEnvironment("NEXT_PUBLIC_API_BASE_URL", apiBaseUrl)
    .WithEnvironment("BACKEND_API_URL", apiBaseUrl)
    .WithReference(api);

builder.Build().Run();

static string? FindDirectoryContainingFile(string startDir, string fileName)
{
    for (var dir = new DirectoryInfo(startDir); dir != null; dir = dir.Parent)
    {
        if (File.Exists(Path.Combine(dir.FullName, fileName)))
        {
            return dir.FullName;
        }
    }

    return null;
}

static string GetNitroGroupsUiPath()
{
    for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir != null; dir = dir.Parent)
    {
        var ui = Path.Combine(dir.FullName, "UI", "nitro-groups");
        if (File.Exists(Path.Combine(ui, "package.json")))
        {
            return Path.GetFullPath(ui);
        }
    }

    throw new InvalidOperationException(
        "No se encontró 'UI/nitro-groups/package.json' al subir directorios desde " + AppContext.BaseDirectory
        + ". Ejecuta el AppHost desde el repositorio NitroGroups.");
}
