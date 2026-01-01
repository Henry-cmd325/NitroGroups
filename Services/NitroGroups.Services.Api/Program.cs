using Microsoft.AspNetCore.Authentication.JwtBearer;
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

// Add services to the container
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddSharedInfrastructure();
builder.Services.AddUsersModule(builder.Configuration);


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

app.UseHttpsRedirection();

app.UseCors("DefaultCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapEndpoints();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = 500;

        var feature = context.Features
            .Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();

        var problemDetails = new
        {
            type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
            title = "Error inesperado",
            status = 500,
            detail = feature?.Error.Message
        };

        Log.Fatal(feature?.Error, "Application terminated unexpectedly");
        await context.Response.WriteAsJsonAsync(problemDetails);
    });
});

Log.Information("Starting NitroGroups API");
app.Run();
