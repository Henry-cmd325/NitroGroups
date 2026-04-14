# NitroGroups Backend Documentation

Welcome to the NitroGroups backend project! This documentation aims to provide new developers with a comprehensive understanding of the project's architecture, communication patterns, and guidelines for developing new features, particularly new API endpoints.

## Table of Contents

1.  [Project Architecture Overview](#1-project-architecture-overview)
    *   [Core Modules](#11-core-modules)
    *   [Shared Components](#12-shared-components)
    *   [Persistence Layer](#13-persistence-layer)
    *   [API Services Layer](#14-api-services-layer)
    *   [Application Host](#15-application-host)
2.  [Communication Between Classes and Modules](#2-communication-between-classes-and-modules)
    *   [Domain-Driven Design (DDD) Principles](#21-domain-driven-design-ddd-principles)
    *   [Dependency Inversion Principle (DIP)](#22-dependency-inversion-principle-dip)
    *   [Event-Driven Communication](#23-event-driven-communication)
    *   [Contracts and Abstractions](#24-contracts-and-abstractions)
3.  [Developing a New API Endpoint](#3-developing-a-new-api-endpoint)
    *   [Step 1: Identify the Domain](#31-step-1-identify-the-domain)
    *   [Step 2: Define Request and Response Contracts](#32-step-2-define-request-and-response-contracts)
    *   [Step 3: Implement Use Case (Application Layer)](#33-step-3-implement-use-case-application-layer)
    *   [Step 4: Implement Infrastructure (if needed)](#34-step-4-implement-infrastructure-if-needed)
    *   [Step 5: Create the Endpoint (API Layer)](#35-step-5-create-the-endpoint-api-layer)
    *   [Step 6: Register Dependencies (Bootstrap Layer)](#36-step-6-register-dependencies-bootstrap-layer)
    *   [Step 7: Testing](#37-step-7-testing)
4.  [Coding Standards and Best Practices](#4-coding-standards-and-best-practices)
5.  [Local Development Setup](#5-local-development-setup)

---

## 1. Project Architecture Overview

The NitroGroups backend follows a modular, layered architecture designed for maintainability, scalability, and clear separation of concerns. It leverages modern .NET development practices, likely including .NET Aspire for orchestration.

### 1.1. Core Modules

The `Core` directory contains the main business logic and domain models, segmented into specific business domains (e.g., `Groups`, `Users`). Each core module typically follows the Clean Architecture pattern with three sub-layers:

*   **`Domain`**: Contains domain entities, value objects, aggregates, domain services, and domain events. This layer is the heart of the business logic and should have no dependencies on other layers.
    *   *Example*: `NitroGroups.Core.Users.Domain/Entities/User.cs`
*   **`Application`**: Implements application-specific business rules. It orchestrates domain objects to perform tasks, defines use cases (commands and queries), and interfaces with the `Infrastructure` layer via abstractions defined in `Domain` or `Shared.Abstractions`.
    *   *Example*: `NitroGroups.Core.Users.Application/UseCases/CreateUserUseCase.cs`
*   **`Infrastructure`**: Provides implementations for interfaces defined in the `Domain` or `Application` layers. This includes data access (repositories), external service integrations, and specific framework implementations. This layer depends on `Domain` and `Application`.
    *   *Example*: `NitroGroups.Core.Users.Infrastructure/Repositories/UserRepository.cs`

### 1.2. Shared Components

The `Shared` directory contains cross-cutting concerns and common utilities used throughout the application to promote reusability and reduce duplication.

*   **`Abstractions`**: Defines interfaces and abstract classes that represent common contracts, ensuring loose coupling between modules and layers.
*   **`Contracts`**: Contains Data Transfer Objects (DTOs), request/response models, and other data structures used for communication between application layers and external services (e.g., API consumers).
*   **`Domain`**: Houses base classes for domain entities, events, and auditable models that are common across different domain modules.
*   **`EndpointMapping`**: Provides mechanisms for easily mapping API endpoints to their respective handlers/use cases.
*   **`Infrastructure`**: Contains common infrastructure components like database contexts, event dispatchers, and generic repository implementations.
*   **`Paging`**: Provides reusable models and extensions for handling pagination in queries.

### 1.3. Persistence Layer

*   **`NitroGroups.Persistence.Context`**: This project is responsible for configuring the Entity Framework Core `DbContext` and managing database migrations. It defines how domain entities are mapped to database tables.

### 1.4. API Services Layer

*   **`NitroGroups.Services.Api`**: This is the entry point for the backend application. It exposes RESTful APIs, handles HTTP requests, and orchestrates the execution of application layer use cases. It contains endpoint definitions and possibly global middleware.

### 1.5. Application Host

*   **`AppHost.AppHost`**: Likely part of a .NET Aspire solution, this project is responsible for defining and orchestrating the different services (API, databases, etc.) that make up the application. It simplifies local development, deployment, and monitoring.
*   **`AppHost.ServiceDefaults`**: Contains common service defaults and configurations applied across all services in the Aspire application.

## 2. Communication Between Classes and Modules

Effective communication between different parts of the system is crucial for a clean and maintainable codebase.

### 2.1. Domain-Driven Design (DDD) Principles

*   **Entities**: Objects with a distinct identity that run through time and different representations.
*   **Value Objects**: Objects that measure, quantify, or describe a thing in the domain. They are immutable and lack conceptual identity.
*   **Aggregates**: A cluster of domain objects that can be treated as a single unit for data changes. An aggregate root is the single entity through which all external access to the aggregate occurs.
*   **Domain Events**: Something that happened in the domain that you want other parts of the same domain (or other domains) to be aware of.

### 2.2. Dependency Inversion Principle (DIP)

Higher-level modules should not depend on lower-level modules. Both should depend on abstractions. Abstractions should not depend on details. Details should depend on abstractions. This is achieved by:

*   **Interfaces/Abstractions**: Defined in `Domain` or `Shared.Abstractions` (e.g., `IRepository`, `IUseCase`).
*   **Dependency Injection**: Managed by `NitroGroups.Core.Bootstrap` and the `Program.cs` in the API service, ensuring that concrete implementations are injected at runtime.

### 2.3. Event-Driven Communication

*   **Domain Events**: Used to signal that something important has happened within a domain, allowing other parts of the system to react without direct coupling. Domain events are typically published and consumed within the same application process (in-process messaging).
    *   *Refer to*: `NitroGroups.Shared.Domain/IDomainEvent.cs` and related `EventHandlers` in `Application` layers.

### 2.4. Contracts and Abstractions

*   **`Shared.Contracts`**: Used to define input (requests) and output (responses) for use cases and API endpoints. This ensures a consistent data exchange format and decouples the API from internal domain models.
*   **`Shared.Abstractions`**: Provides interfaces for services, repositories, and other components that need to be consumed across different layers or modules.

## 3. Developing a New API Endpoint

This section outlines the typical workflow for adding a new API endpoint to the NitroGroups backend, following the established architectural patterns.

### 3.1. Step 1: Identify the Domain

Determine which `Core` module (e.g., `Users`, `Groups`) the new endpoint's functionality belongs to. This ensures that related logic is kept together. If it's a new domain, a new `Core` module (e.g., `Core/NewFeature`) might be needed.

### 3.2. Step 2: Define Request and Response Contracts

In the appropriate `Shared.Contracts` sub-folder (e.g., `Shared/Contracts/Users` or `Shared/Contracts/Groups`), define the DTOs for the incoming request payload and the outgoing response.

*   **Example (Create User Request):**
    ```csharp
    // NitroGroups.Shared.Contracts/Users/CreateUserRequest.cs
    namespace NitroGroups.Shared.Contracts.Users;

    public record CreateUserRequest(string Email, string FirstName, string LastName);

    public record CreateUserResponse(Guid UserId, string Email);
    ```

### 3.3. Step 3: Implement Use Case (Application Layer)

Create a new use case in the `Application` layer of the relevant `Core` module. This use case will encapsulate the specific business logic for the new functionality.

*   **Interface (e.g., `IUseCase<TRequest, TResponse>`):** Define an interface for your use case in `Application/Abstractions`.
    ```csharp
    // NitroGroups.Core.Users.Application/Abstractions/ICreateUserUseCase.cs
    using NitroGroups.Shared.Contracts.Users;
    using NitroGroups.Shared.Contracts; // For Result<T>

    namespace NitroGroups.Core.Users.Application.Abstractions;

    public interface ICreateUserUseCase : IUseCase<CreateUserRequest, Result<CreateUserResponse>>
    {
    }
    ```
*   **Implementation:** Implement the use case, orchestrating domain entities and interacting with repositories (via their interfaces, defined in `Domain` and implemented in `Infrastructure`).
    ```csharp
    // NitroGroups.Core.Users.Application/UseCases/CreateUserUseCase.cs
    using NitroGroups.Core.Users.Domain.Entities;
    using NitroGroups.Core.Users.Domain.Repositories;
    using NitroGroups.Shared.Contracts;
    using NitroGroups.Shared.Contracts.Users;

    namespace NitroGroups.Core.Users.Application.UseCases;

    public class CreateUserUseCase : ICreateUserUseCase
    {
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWorkUser _unitOfWork;

        public CreateUserUseCase(IUserRepository userRepository, IUnitOfWorkUser unitOfWork)
        {
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<CreateUserResponse>> ExecuteAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
        {
            // Example: Business logic for creating a user
            if (await _userRepository.UserExistsAsync(request.Email))
            {
                return Result<CreateUserResponse>.Failure("User with this email already exists.");
            }

            var user = User.Create(request.Email, request.FirstName, request.LastName);
            await _userRepository.AddAsync(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<CreateUserResponse>.Success(new CreateUserResponse(user.Id, user.Email));
        }
    }
    ```

### 3.4. Step 4: Implement Infrastructure (if needed)

If your use case requires new data access methods or interactions with external services, implement these in the `Infrastructure` layer of your `Core` module.

*   **Repository Interface (Domain Layer):**
    ```csharp
    // NitroGroups.Core.Users.Domain/Repositories/IUserRepository.cs
    using NitroGroups.Core.Users.Domain.Entities;
    using NitroGroups.Shared.Abstractions.Repository;

    namespace NitroGroups.Core.Users.Domain.Repositories;

    public interface IUserRepository : IRepository<User>
    {
        Task<bool> UserExistsAsync(string email);
        Task AddAsync(User user);
        // ... other user-specific repository methods
    }
    ```
*   **Repository Implementation (Infrastructure Layer):**
    ```csharp
    // NitroGroups.Core.Users.Infrastructure/Repositories/UserRepository.cs
    using Microsoft.EntityFrameworkCore;
    using NitroGroups.Core.Users.Domain.Entities;
    using NitroGroups.Core.Users.Domain.Repositories;
    using NitroGroups.Persistence.Context;
    using NitroGroups.Shared.Infrastructure.Repository;

    namespace NitroGroups.Core.Users.Infrastructure.Repositories;

    public class UserRepository : Repository<User>, IUserRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public UserRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<bool> UserExistsAsync(string email)
        {
            return await _dbContext.Users.AnyAsync(u => u.Email == email);
        }

        public async Task AddAsync(User user)
        {
            await _dbContext.Users.AddAsync(user);
        }
    }
    ```

### 3.5. Step 5: Create the Endpoint (API Layer)

In `Services/NitroGroups.Services.Api/Endpoints`, create a new endpoint class that implements `IEndpoint` from `NitroGroups.Shared.EndpointMapping`. This class will define the HTTP route, method, and delegate the request to your use case.

*   **Example (Create User Endpoint):**
    ```csharp
    // Services/NitroGroups.Services.Api/Endpoints/Users/CreateUserEndpoint.cs
    using Carter; // Assuming Carter for endpoint mapping
    using Microsoft.AspNetCore.Mvc;
    using NitroGroups.Core.Users.Application.Abstractions;
    using NitroGroups.Shared.Contracts.Users;
    using NitroGroups.Shared.EndpointMapping;

    namespace NitroGroups.Services.Api.Endpoints.Users;

    public class CreateUserEndpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("/api/users", async ([FromBody] CreateUserRequest request, ICreateUserUseCase useCase, CancellationToken cancellationToken) =>
            {
                var result = await useCase.ExecuteAsync(request, cancellationToken);
                return result.IsSuccess ? Results.Created($"/api/users/{result.Value.UserId}", result.Value) : Results.BadRequest(result.Error);
            })
            .WithName("CreateUser")
            .Produces<CreateUserResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .WithOpenApi();
        }
    }
    ```

### 3.6. Step 6: Register Dependencies (Bootstrap Layer)

Ensure that your new use case, repository interfaces, and their implementations are registered in the Dependency Injection container. This typically happens in the `ApplicationServiceCollectionExtensions.cs` and `InfrastructureServiceCollectionExtensions.cs` within your `Core` module, and then aggregated in `NitroGroups.Core.Bootstrap`.

*   **Example (`Core/Users/Application/ApplicationServiceCollectionExtensions.cs`):**
    ```csharp
    // NitroGroups.Core.Users.Application/ApplicationServiceCollectionExtensions.cs
    using Microsoft.Extensions.DependencyInjection;
    using NitroGroups.Core.Users.Application.Abstractions;
    using NitroGroups.Core.Users.Application.UseCases;

    namespace NitroGroups.Core.Users.Application;

    public static class ApplicationServiceCollectionExtensions
    {
        public static IServiceCollection AddUsersApplication(this IServiceCollection services)
        {
            services.AddScoped<ICreateUserUseCase, CreateUserUseCase>();
            // Register other use cases
            return services;
        }
    }
    ```
*   **Example (`Core/Users/Infrastructure/InfrastructureServiceCollectionExtensions.cs`):**
    ```csharp
    // NitroGroups.Core.Users.Infrastructure/InfrastructureServiceCollectionExtensions.cs
    using Microsoft.Extensions.DependencyInjection;
    using NitroGroups.Core.Users.Domain.Repositories;
    using NitroGroups.Core.Users.Infrastructure.Repositories;

    namespace NitroGroups.Core.Users.Infrastructure;

    public static class InfrastructureServiceCollectionExtensions
    {
        public static IServiceCollection AddUsersInfrastructure(this IServiceCollection services)
        {
            services.AddScoped<IUserRepository, UserRepository>();
            // Register other infrastructure components
            return services;
        }
    }
    ```
*   **Example (`Core/Bootstrap/UsersModule.cs`):** (This file might need to be created or updated if it exists)
    ```csharp
    // NitroGroups.Core.Bootstrap/UsersModule.cs
    using Microsoft.Extensions.DependencyInjection;
    using NitroGroups.Core.Users.Application;
    using NitroGroups.Core.Users.Infrastructure;

    namespace NitroGroups.Core.Bootstrap;

    public static class UsersModule
    {
        public static IServiceCollection AddUsersModule(this IServiceCollection services)
        {
            services.AddUsersApplication();
            services.AddUsersInfrastructure();
            return services;
        }
    }
    ```
*   **Example (`Core/Bootstrap/GroupsModule.cs`):**
    ```csharp
    // NitroGroups.Core.Bootstrap/GroupsModule.cs
    // ... existing content ...
    ```

### 3.7. Testing

Write unit tests for your use cases (application layer) and integration tests for your API endpoints to ensure correct behavior and adherence to business rules.

*   **Unit Tests**: Focus on the logic within your use case, mocking dependencies like repositories.
*   **Integration Tests**: Verify the entire flow from the API endpoint down to the database (or mocked external services).

## 4. Coding Standards and Best Practices

*   **Naming Conventions**: Follow C# naming conventions (PascalCase for classes, methods, properties; camelCase for parameters, local variables).
*   **Asynchronous Programming**: Use `async` and `await` for I/O-bound operations to ensure responsiveness.
*   **Error Handling**: Use `Result<T>` pattern from `NitroGroups.Shared.Contracts` for handling and propagating errors gracefully.
*   **Logging**: Implement structured logging (e.g., Serilog) for better observability.
*   **Security**: Be mindful of common security vulnerabilities (e.g., SQL Injection, XSS) and use appropriate framework features (e.g., input validation, authentication, authorization).
*   **Performance**: Optimize database queries, use caching where appropriate, and avoid N+1 problems.

## 5. Local Development Setup

Refer to the root `README.md` and any Aspire-specific documentation for setting up your local development environment. Generally, this involves:

1.  Cloning the repository.
2.  Ensuring .NET SDK (version X.Y) is installed.
3.  Restoring NuGet packages.
4.  Setting up local database (e.g., PostgreSQL with Docker).
5.  Running the `AppHost` project.

---

This document is a living guide. Please contribute to its improvement by suggesting changes or additions.