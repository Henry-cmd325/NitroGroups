using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using NitroGroups.Core.Users.Domain.Entities;
using NitroGroups.Shared.EndpointMapping;
using NitroGroups.Core.Users.Application.Abstractions;
using static Microsoft.AspNetCore.Http.Results;
using Microsoft.Extensions.Logging;
using NitroGroups.Shared.Domain.DomainEvents.Users.Enums;

namespace NitroGroups.Core.Users.Infrastructure.Endpoints.Users
{
    public class CreateTestData(ILogger<CreateTestData> logger) : IEndpoint
    {
        private readonly ILogger<CreateTestData> _logger = logger;
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("api/users/test-data", async (IUnitOfWorkUser unitOfWork) => {
                var testUser = new User(
                    auth0Id: "test-auth0-id-123",
                    email: "test@example.com",
                    firstName: "Juan",
                    lastName: "Pérez",
                    userType: UserType.Client
                );

                var transaction = await unitOfWork.BeginTransactionAsync();

                try
                {
                    await unitOfWork.Users.CreateAsync(testUser);
                    testUser.RaiseSoloMusicianCreatedEvent();
                    await unitOfWork.OutboxService.SaveEventsAsync(testUser.DomainEvents);
                    await unitOfWork.CompleteAsync();
                    await transaction.CommitAsync();
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError("Ocurrio un error: {Message}", ex.Message);
                }

                return Ok(new { 
                    message = "Usuario de prueba creado con Domain Events procesados", 
                    user = new {
                        id = testUser.Id,
                        email = testUser.Email,
                        firstName = testUser.FirstName,
                        lastName = testUser.LastName,
                        userType = testUser.UserType,
                        createdAt = testUser.CreatedAt
                    },
                    domainEventsProcessed = "UserCreatedDomainEvent fue procesado automáticamente"
                });
            });
        }
    }
}


