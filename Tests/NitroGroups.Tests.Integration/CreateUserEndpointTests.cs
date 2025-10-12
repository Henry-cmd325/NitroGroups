using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using NitroGroups.Core.Users.Application.Dtos.Requests;
using NitroGroups.Core.Users.Domain.Entities;

namespace NitroGroups.Tests.Integration;

public class CreateUserEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CreateUserEndpointTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateUser_WithValidData_ReturnsOk()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Auth0Id = "auth0|123456",
            Email = "test.user@example.com",
            FirstName = "Test",
            LastName = "User",
            UserType = UserType.Client
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Usuario creado", content);
    }

    [Fact]
    public async Task CreateUser_WithInvalidData_ReturnsValidationProblem()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Auth0Id = "", // Invalid data
            Email = "not-an-email",
            FirstName = "",
            LastName = "",
            UserType = (UserType)99 // Invalid enum value
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        Assert.NotNull(problemDetails);
        Assert.True(problemDetails.Errors.ContainsKey("Auth0Id"));
        Assert.True(problemDetails.Errors.ContainsKey("Email"));
        Assert.True(problemDetails.Errors.ContainsKey("FirstName"));
        Assert.True(problemDetails.Errors.ContainsKey("LastName"));
        Assert.True(problemDetails.Errors.ContainsKey("UserType"));
    }
}