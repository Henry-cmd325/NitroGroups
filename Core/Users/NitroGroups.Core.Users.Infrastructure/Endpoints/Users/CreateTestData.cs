using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Application.Abstractions.Services;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.EndpointMapping;
using static Microsoft.AspNetCore.Http.Results;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Users
{
    public class CreateTestData : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/users/test-data", async (IUserService userService) => {
                var testUser = new User(
                    auth0Id: "test-auth0-id-123",
                    email: "test@example.com",
                    firstName: "Juan",
                    lastName: "Pérez",
                    userType: UserType.Client
                );

                var createdUser = await userService.CreateAsync(testUser);
                
                return Ok(new { 
                    message = "Usuario de prueba creado con Domain Events procesados", 
                    user = new {
                        id = createdUser.Id,
                        email = createdUser.Email,
                        firstName = createdUser.FirstName,
                        lastName = createdUser.LastName,
                        userType = createdUser.UserType.ToString(),
                        createdAt = createdUser.CreatedAt
                    },
                    domainEventsProcessed = "UserCreatedDomainEvent fue procesado automáticamente"
                });
            });
        }
    }
}


