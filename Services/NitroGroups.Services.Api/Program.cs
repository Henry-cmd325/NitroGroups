using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using NitroGroups.Core.Bootstrap;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.Abstractions.Events;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Shared.Infrastructure;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

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

// Add services to the container
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddSharedInfrastructure();
builder.Services.AddUsersModule(builder.Configuration);

builder.Services.Configure<NitroGroups.Shared.Infrastructure.Configuration.Auth0ManagementApiSettings>(
    builder.Configuration.GetSection("Auth0ManagementApi"));

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

var app = builder.Build();

// Register Event Types
var eventProvider = app.Services.GetRequiredService<IEventProvider>();
eventProvider.RegisterEventsFromAssembly(typeof(NitroGroups.Core.Users.Application.Events.UserEvents).Assembly);
eventProvider.RegisterEventsFromAssembly(typeof(NitroGroups.Core.Groups.Application.Events.UserEvents).Assembly);

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
