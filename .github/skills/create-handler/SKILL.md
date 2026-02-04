# Skill: C# Vertical Slice Generator - NitroGroups

## Arquitectura
- **Namespace base:** `NitroGroups.Core.{ModuleName}`
- **Patrón:** Mediador (`Cortex.Mediator`) con Vertical Slices.
- **Capas por Módulo:**
  1. **Application:** `UseCases/{Entity}/{Action}/` (Contiene Handlers, Commands/Queries, Validators y Mappings).
  2. **Domain:** `Entities`, `Events`.
  3. **Infrastructure:** `Adapters`, `Endpoints`, `Services`, `UnitOfWork{ModuleName}`.

## Instrucciones de Generación
Cuando se solicite un nuevo "Vertical Slice" o "Handler":

1. **Application (Capa de Aplicación):**
   - Archivo: `UseCases/{Entity}/{Action}/{Action}CommandHandler.cs` (o QueryHandler).
   - Estructura: 
     - Primero el `public record {Action}Command(...) : ICommand<{TResponse}>`.
     - Luego el `internal sealed class {Action}CommandHandler : ICommandHandler<{Action}Command, {TResponse}>`.
   - **Validación:** Crear en la misma carpeta `{Action}RequestValidator.cs` usando `FluentValidation`.

2. **Infrastructure (Capa de Infraestructura):**
   - Archivo: `Endpoints/{Entity}/{Action}.cs`.
   - Acción: Implementar `IEndpoint`. Usar `mediator.SendCommandAsync` o `SendQueryAsync` según el tipo de acción.
   - **UnitOfWork:** Inyectar `IUnitOfWork{ModuleName}` en el Handler para acceder a los datos.

## Estándares de Código
- Usar **File-scoped namespaces**.
- Usar **Primary Constructors** (C# 12+).
- Seguir la convención de nombres: `PascalCase` para clases/métodos, `camelCase` para parámetros.