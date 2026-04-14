# Naming Conventions for NitroGroups Backend

Consistent naming is crucial for readability, maintainability, and understanding the architecture of the NitroGroups backend. This document outlines the naming conventions to be followed.

## General C# Conventions

*   **Classes, Methods, Properties, Public Fields:** `PascalCase` (e.g., `CreateUserCommand`, `Handle`, `FirstName`).
*   **Method Parameters, Local Variables, Private Fields:** `camelCase` (e.g., `createUserCommand`, `repository`).
*   **Interfaces:** `IPascalCase` (e.g., `IUserRepository`, `ICommand`).
*   **Enums:** `PascalCase` for enum type and its members.
*   **Constants:** `PascalCase`.
*   **File-scoped namespaces:** Used where applicable.

## Architectural Component Naming

### Modules

*   **Folder Structure:** `Core/{ModuleName}/` (e.g., `Core/Users`, `Core/Groups`).
*   **Project Names:** `NitroGroups.Core.{ModuleName}.Domain`, `NitroGroups.Core.{ModuleName}.Application`, `NitroGroups.Core.{ModuleName}.Infrastructure`.
*   **Namespace:** `NitroGroups.Core.{ModuleName}.{Layer}` (e.g., `NitroGroups.Core.Users.Application`).

### Vertical Slices (Features)

For a feature related to an `Entity` and an `Action` (e.g., User, Create):

*   **Feature Folder:** `Core/{ModuleName}.Application/UseCases/{ActionName}/` (e.g., `Core/Users/NitroGroups.Core.Users.Application/UseCases/CreateUser/`).
*   **Command/Query:** `{ActionName}{EntityName}Command` or `{ActionName}{EntityName}Query` (e.g., `CreateUserCommand`, `GetUserByIdQuery`).
    *   If the context is clear and `EntityName` is redundant (e.g., in a `Users` module, `CreateUserCommand` is clear), it can be shortened to `{ActionName}Command`.
*   **Handler:** `{ActionName}{EntityName}CommandHandler` or `{ActionName}{EntityName}QueryHandler` (e.g., `CreateUserCommandHandler`, `GetUserByIdQueryHandler`).
*   **Validator:** `{ActionName}{EntityName}CommandValidator` or `{ActionName}{EntityName}QueryValidator` (e.g., `CreateUserCommandValidator`).

### Contracts (DTOs)

*   **Request DTO:** `{ActionName}Request` (e.g., `CreateUserRequest`, `UpdateProductRequest`).
    *   Location: `Shared/NitroGroups.Shared.Contracts/{ModuleName}/{ActionName}Request.cs`.
*   **Response DTO:** `{ActionName}Response` (e.g., `CreateUserResponse`, `ProductDetailResponse`).
    *   Location: `Shared/NitroGroups.Shared.Contracts/{ModuleName}/{ActionName}Response.cs`.

### Repositories

*   **Interface:** `I{EntityName}Repository` (e.g., `IUserRepository`, `IProductRepository`).
    *   Location: `Core/{ModuleName}.Domain/Repositories/I{EntityName}Repository.cs`.
*   **Implementation:** `{EntityName}Repository` (e.g., `UserRepository`, `ProductRepository`).
    *   Location: `Core/{ModuleName}.Infrastructure/Repositories/{EntityName}Repository.cs`.

### Unit of Work

*   **Interface:** `IUnitOfWork{ModuleName}` (e.g., `IUnitOfWorkUsers`, `IUnitOfWorkGroups`).
*   **Implementation:** `UnitOfWork{ModuleName}` (e.g., `UnitOfWorkUsers`, `UnitOfWorkGroups`).

### Endpoints

*   **Class Name:** `{ActionName}Endpoint` (e.g., `CreateUserEndpoint`, `GetProductsEndpoint`).
*   **File Name:** `{ActionName}Endpoint.cs`.
*   **Route:** Typically `api/{moduleName (lowercase)}/{entityName (plural, lowercase)}` or `api/{moduleName (lowercase)}/{actionName (lowercase)}`.
    *   Example: `/api/users` for `CreateUserEndpoint`.
    *   Example: `/api/products/{id}` for `GetProductByIdEndpoint`.

## General Advice

*   **Be Explicit:** Names should clearly convey intent and purpose. Avoid cryptic abbreviations.
*   **Context Matters:** While general rules apply, context within a specific module or feature can influence minor variations.
*   **Consistency:** Once a convention is adopted for a specific pattern, stick to it throughout the codebase.

Following these conventions will help maintain a readable and predictable codebase, making it easier for new and existing team members to navigate and contribute effectively.