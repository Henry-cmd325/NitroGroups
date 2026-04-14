# Architecture Guide for NitroGroups Vertical Slices

This document provides a concise overview of the architectural principles and patterns applied when developing new features in the NitroGroups backend, especially within the context of Vertical Slices and the Mediator pattern.

## Core Concepts

### 1. Clean Architecture / Onion Architecture

The project adheres to Clean Architecture principles, organizing code into concentric layers. Dependencies flow inwards, meaning inner layers (Domain) are independent of outer layers (Application, Infrastructure, UI).

*   **Domain Layer (`Core.{ModuleName}.Domain`):**
    *   **Purpose:** Contains the core business rules, entities, value objects, aggregates, and domain events. This is the heart of the business.
    *   **Dependencies:** None. It is independent.
    *   **Key Components:** Entities, Value Objects, Aggregates, Domain Services, Domain Events, Repository Interfaces (`IRepository`).
*   **Application Layer (`Core.{ModuleName}.Application`):**
    *   **Purpose:** Implements application-specific business rules. It defines and orchestrates the application's use cases (commands and queries). It is where the business logic that interacts with domain objects and orchestrates data flow resides.
    *   **Dependencies:** Depends on the Domain layer.
    *   **Key Components:** Commands, Queries, CommandHandlers, QueryHandlers, Validators (e.g., using FluentValidation), Domain Event Handlers.
*   **Infrastructure Layer (`Core.{ModuleName}.Infrastructure`):**
    *   **Purpose:** Provides the implementation details for interfaces defined in the Domain and Application layers. This includes data access (concrete Repository implementations, ORM configuration), external service integrations, and API endpoint definitions.
    *   **Dependencies:** Depends on the Application and Domain layers.
    *   **Key Components:** Concrete Repository implementations, External Service Adapters, API Endpoints (`IEndpoint` implementations), `UnitOfWork` implementations.
*   **Shared Layer (`Shared` projects):**
    *   **Purpose:** Contains cross-cutting concerns, common abstractions, contracts (DTOs), and utilities used across multiple modules or layers.
    *   **Key Components:** Abstractions (common interfaces), Contracts (request/response DTOs), common Domain base classes, Endpoint Mapping interfaces, common Infrastructure components (e.g., base `Repository`).

### 2. Vertical Slice Architecture

Instead of organizing code purely by type across the entire application (e.g., all controllers in one folder, all services in another), Vertical Slice Architecture organizes code by feature. All components related to a specific feature (a "slice") are kept together.

*   **Benefits:**
    *   **Reduced Coupling:** Changes to one feature are less likely to impact others.
    *   **Improved Maintainability:** All code for a feature is in one place, making it easier to understand and modify.
    *   **Easier Onboarding:** New developers can pick up features more quickly.
    *   **Scalability:** Features can potentially be scaled or even extracted into separate services more easily.

### 3. Mediator Pattern (`Cortex.Mediator`)

The Mediator pattern is heavily used to decouple the sending of a request from its handling.

*   **Commands & Queries:** Represent a request to perform an action (Command) or retrieve data (Query). They are simple data structures.
*   **Handlers:** Implement the logic to execute a specific Command or Query. Each Command/Query has a dedicated Handler.
*   **IMediator:** An interface that allows sending Commands/Queries. The API endpoint (or any other component needing to trigger business logic) sends the Command/Query to the `IMediator`, which then dispatches it to the correct Handler.
*   **Benefits:**
    *   **Decoupling:** Senders don't need to know about Handlers, and Handlers don't need to know about other Handlers.
    *   **Reduced Complexity:** Simplifies the dependency graph within the application layer.

### 4. Domain Events

Domain Events are used to explicitly model side effects of actions within the domain. They capture "something that happened in the domain that others care about."

*   **Location:** Defined in the `Domain` layer (e.g., `Core.{ModuleName}.Domain/Events`).
*   **Publishing:** Typically raised by aggregate roots during a state change.
*   **Handling:** Handled by `INotificationHandler` (if using a library like MediatR for domain events) in the `Application` layer.
*   **Nature:** In this project, domain events are primarily used for in-process communication, allowing different parts of the application to react to domain changes without direct coupling.

## How it All Fits Together (Simplified Flow for a Command)

1.  **API Request:** An HTTP request hits an endpoint in `Services/NitroGroups.Services.Api`.
2.  **Endpoint (`IEndpoint`):** The endpoint class (in `Core.{ModuleName}.Infrastructure/Endpoints`) receives the request. It maps the incoming request DTO to a `Command` object.
3.  **Mediator Dispatch:** The endpoint sends the `Command` to `IMediator.SendCommandAsync()`.
4.  **Command Handler:** The `IMediator` finds and invokes the corresponding `CommandHandler` (in `Core.{ModuleName}.Application/UseCases/{Feature}/`).
5.  **Validation:** Before executing the main logic, the `CommandHandler` (or a pipeline behavior before it) might trigger a `FluentValidation` validator (also in `Core.{ModuleName}.Application/UseCases/{Feature}/`) to validate the `Command` properties.
6.  **Business Logic:** The `CommandHandler` executes the core business logic:
    *   It retrieves necessary data from repositories (via interfaces defined in `Domain` and implemented in `Infrastructure`).
    *   It interacts with domain entities (from `Domain` layer) to perform operations.
    *   It might raise new `Domain Events` if significant domain changes occur.
7.  **Persistence:** Changes are persisted using the `UnitOfWork` (e.g., `IUnitOfWork{ModuleName}` interface from `Domain`, implementation from `Infrastructure`). `SaveChangesAsync` also ensures any raised Domain Events are dispatched.
8.  **Response:** The `CommandHandler` returns a `Result<TResponse>`.
9.  **API Response:** The endpoint translates the `Result<TResponse>` into an appropriate HTTP response (e.g., 201 Created, 200 OK, 400 Bad Request).

This structured approach ensures a clear separation of concerns, high testability, and a consistent development experience.