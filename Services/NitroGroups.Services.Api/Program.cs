using System;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using NitroGroups.Core.Bootstrap;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.Infrastructure;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Subidas multipart a almacenamiento de objetos (R2 / S3-compatible; `POST /api/groups/.../media/upload`).
const long maxUploadBytes = 52_428_800;
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxUploadBytes);
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = maxUploadBytes);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

builder.AddServiceDefaults();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        if (allowedOrigins.Length == 0)
        {
            Log.Warning("CORS is configured to allow any origin. This is not recommended for production environments.");
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    builder.Configuration.Bind("Auth0", options);
});
builder.Services.AddAuthorization();

builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Title ??= "Error inesperado";
        context.ProblemDetails.Type ??= $"https://httpstatuses.io/{context.ProblemDetails.Status}";
        context.ProblemDetails.Extensions.TryAdd("traceId", context.HttpContext.TraceIdentifier);
    };
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache(); // Required for IdempotencyFilter

// Add services to the container
builder.Services.AddSharedInfrastructure(builder.Configuration);

builder.Services.AddUsersModule(builder.Configuration);
builder.Services.AddGroupsModule(builder.Configuration);
builder.Services.AddSchedulesModule(builder.Configuration);

builder.Services.Configure<NitroGroups.Shared.Infrastructure.Configuration.Auth0ManagementApiSettings>(
    builder.Configuration.GetSection("Auth0ManagementApi"));

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    var authority = app.Configuration["Auth0:Authority"];
    var audience = app.Configuration["Auth0:Audience"];
    if (string.IsNullOrWhiteSpace(authority) || string.IsNullOrWhiteSpace(audience))
    {
        Log.Warning(
            "Auth0:Authority y/o Auth0:Audience no están definidos. Los endpoints con [Authorize] devolverán 401. " +
            "En este proyecto: `dotnet user-secrets set \"Auth0:Authority\" \"https://TU-DOMINIO.auth0.com/\"` y " +
            "`dotnet user-secrets set \"Auth0:Audience\" \"<mismo valor que AUTH0_AUDIENCE en el front>\"`, " +
            "o ejecuta la API vía AppHost con la sección Auth0 configurada.");
    }

    var r2Key = app.Configuration["R2:AccessKeyId"]
        ?? Environment.GetEnvironmentVariable("R2__AccessKeyId")
        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_ACCESS_KEY_ID");
    var r2Secret = app.Configuration["R2:SecretAccessKey"]
        ?? Environment.GetEnvironmentVariable("R2__SecretAccessKey")
        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    var r2Public = app.Configuration["R2:PublicBaseUrl"]
        ?? Environment.GetEnvironmentVariable("R2__PublicBaseUrl")
        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_PUBLIC_BASE_URL");
    var r2Account = app.Configuration["R2:AccountId"]
        ?? Environment.GetEnvironmentVariable("R2__AccountId")
        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_ACCOUNT_ID");
    var r2ServiceUrl = app.Configuration["R2:ServiceUrl"]
        ?? Environment.GetEnvironmentVariable("R2__ServiceUrl")
        ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_SERVICE_URL");
    if (string.IsNullOrWhiteSpace(r2Key) || string.IsNullOrWhiteSpace(r2Secret)
        || string.IsNullOrWhiteSpace(r2Public)
        || (string.IsNullOrWhiteSpace(r2Account) && string.IsNullOrWhiteSpace(r2ServiceUrl)))
    {
        Log.Warning(
            "R2 no está resuelto. La subida (POST .../media/upload) devolverá 503. " +
            "Configura la sección R2 en `NitroGroups.Services.Api/appsettings.Development.json` " +
            "(o User Secrets del mismo proyecto; ver `r2.storage.example.json`). " +
            "Variables admitidas: R2__AccessKeyId, R2__SecretAccessKey, R2__PublicBaseUrl, R2__AccountId (o R2__ServiceUrl).");
    }
}

// Register Event Types
var eventProvider = app.Services.GetRequiredService<IEventProvider>();
eventProvider.RegisterEventsFromAssembly(typeof(NitroGroups.Core.Users.Application.Events.UserEvents).Assembly);
eventProvider.RegisterEventsFromAssembly(typeof(NitroGroups.Core.Groups.Application.Events.UsersEvents).Assembly);

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseCors("DefaultCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapEndpoints();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<IExceptionHandlerPathFeature>();
        var problemDetailsService = context.RequestServices.GetRequiredService<IProblemDetailsService>();

        Log.Error(feature?.Error, "Unhandled exception");

        var problemDetailsContext = new ProblemDetailsContext
        {
            HttpContext = context,
            Exception = feature?.Error,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "Error inesperado",
                Detail = feature?.Error.Message,
                Type = "https://httpstatuses.io/500"
            }
        };

        await problemDetailsService.WriteAsync(problemDetailsContext);
    });
});

Log.Information("Starting NitroGroups API");
app.Run();
