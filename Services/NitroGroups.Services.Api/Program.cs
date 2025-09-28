using NitroGroups.Core.Bootstrap;
using NitroGroups.Persistence.Context;
using NitroGroups.Shared.EndpointMapping;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add services to the container
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddUsersModule(builder.Configuration);

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapEndpoints();

app.Run();
