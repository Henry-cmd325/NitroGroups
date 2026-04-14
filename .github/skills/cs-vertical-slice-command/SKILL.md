---
name: cs-vertical-slice-command
description: Generates boilerplate C# code for a new Vertical Slice Command, its corresponding CommandHandler, and a FluentValidation CommandValidator within the NitroGroups project's established Clean Architecture and Mediator pattern. Use when scaffolding a new write operation (feature) in the application layer.
---

# C# Vertical Slice Command Generator - NitroGroups

This skill automates the generation of boilerplate code for core application layer components when creating a new "Vertical Slice" feature in the NitroGroups backend. It helps ensure consistency with the project's Clean Architecture, Mediator pattern, and coding standards.

## When to Use This Skill

Use this skill when you need to implement a new **write operation** (a feature that modifies the application state, typically via a Command) that requires:

*   A Command DTO (`ICommand<TResponse>`)
*   A Command Handler (`ICommandHandler<TCommand, TResponse>`)
*   An optional Command Validator (`AbstractValidator<TCommand>`)
*   Associated Request and Response DTOs for API communication.
*   A corresponding API Endpoint.

## How to Use This Skill

This skill utilizes a Node.js script `generate_command.cjs` and Handlebars templates to scaffold the necessary files.

### 1. Prepare Your Input

You will need to provide the following information:

*   **`moduleName`**: The name of the core module (e.g., `Users`, `Groups`). This determines the project and namespace structure.
*   **`entityName`**: The primary entity this command operates on (e.g., `User`, `Product`). Used for naming conventions (e.g., `IUserRepository`).
*   **`actionName`**: The specific action the command performs (e.g., `CreateUser`, `UpdateProductPrice`, `DeleteOrder`). This will form the base of command, handler, and endpoint names.
*   **`propertiesJson`**: A JSON string representing the properties of your command/request. This should be an array of objects, where each object has `name` and `type` fields.
    *   **Example:** `[{"name": "Email", "type": "string"}, {"name": "FirstName", "type": "string"}, {"name": "LastName", "type": "string"}]`

### 2. Run the Generation Script

Execute the `generate_command.cjs` script located in `scripts/` within this skill's directory.

**Example Invocation:**

```bash
node .github/skills/cs-vertical-slice-command/scripts/generate_command.cjs Users User Create '{"properties": [{"name": "Email", "type": "string"}, {"name": "FirstName", "type": "string"}, {"name": "LastName", "type": "string"}]}'
```

*Note: Ensure the `propertiesJson` is correctly escaped for your shell if passing it directly on the command line.*

### 3. Review Generated Files

The script will generate the following files (or similar, based on `moduleName`, `entityName`, and `actionName`):

*   **Application Layer (`Core/{moduleName}/NitroGroups.Core.{moduleName}.Application/UseCases/{actionName}/`):**
    *   `{{actionName}}Command.cs`: The command record, implementing `ICommand<Result<{{actionName}}Response>>`.
    *   `{{actionName}}CommandHandler.cs`: The handler for the command, implementing `ICommandHandler<{{actionName}}Command, Result<{{actionName}}Response>>`. This file will contain `TODO` comments indicating where to implement the business logic.
    *   `{{actionName}}CommandValidator.cs`: A basic FluentValidation validator for the command.
*   **Shared Contracts Layer (`Shared/NitroGroups.Shared.Contracts/{moduleName}/`):**
    *   `{{actionName}}Request.cs`: The request DTO for API input.
    *   `{{actionName}}Response.cs`: The response DTO for API output.
*   **Infrastructure Layer (`Core/{moduleName}/NitroGroups.Core.{moduleName}.Infrastructure/Endpoints/`):**
    *   `{{actionName}}Endpoint.cs`: The API endpoint definition, implementing `IEndpoint` and using `IMediator` to dispatch the command.

### 4. Next Steps (Post-Generation)

After generation, you will need to:

1.  **Implement Business Logic:** Fill in the `TODO` sections in `{{actionName}}CommandHandler.cs` with the actual business logic, interacting with domain entities and repositories.
2.  **Refine Validation:** Customize the `{{actionName}}CommandValidator.cs` with specific validation rules for your command's properties.
3.  **Adjust Response DTO:** Modify `{{actionName}}Response.cs` to accurately reflect the data returned by your command.
4.  **Implement Repository Methods:** If your handler requires new data access methods, define them in `I{{entityName}}Repository.cs` (in the Domain layer) and implement them in `{{entityName}}Repository.cs` (in the Infrastructure layer).
5.  **Register Dependencies:** Ensure all new components (handler, validator, endpoint) are correctly registered in the Dependency Injection container. Refer to the `Core/NitroGroups.Core.Bootstrap/{ModuleName}Module.cs`, `ApplicationServiceCollectionExtensions.cs`, and `InfrastructureServiceCollectionExtensions.cs` files for examples.
6.  **Testing:** Write unit and integration tests for your new feature.

## References

*   **Architecture Guide:** For a deeper understanding of the project's architectural patterns (Clean Architecture, Vertical Slices, Mediator, Domain Events), refer to `references/architecture_guide.md`.
*   **Naming Conventions:** For detailed naming guidelines for all components, refer to `references/naming_conventions.md`.

## Customization

The Handlebars templates in `assets/templates/` can be modified if you need to adjust the generated code structure or content.

---