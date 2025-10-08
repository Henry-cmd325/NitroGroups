# Cambios en el Mapeo de Base de Datos - PostgreSQL Snake Case

## Resumen de Cambios

Se han actualizado las configuraciones de Entity Framework para usar la convención de nomenclatura `snake_case` en PostgreSQL, que es la práctica recomendada para bases de datos PostgreSQL.

## Cambios Realizados

### 1. Configuración de Entidades (`UserConfiguration.cs`)

Se agregó `.HasColumnName()` a todas las propiedades para mapear correctamente a columnas en snake_case:

| Propiedad C# | Columna PostgreSQL |
|---------------|-------------------|
| `Auth0Id` | `auth0_id` |
| `Email` | `email` |
| `FirstName` | `first_name` |
| `LastName` | `last_name` |
| `Phone` | `phone` |
| `UserType` | `user_type` |
| `ProfilePictureUrl` | `profile_picture_url` |
| `LocationText` | `location_text` |
| `CreatedAt` | `created_at` |
| `LastLoginAt` | `last_login_at` |
| `EmailVerified` | `email_verified` |
| `PhoneVerified` | `phone_verified` |
| `Active` | `active` |

### 2. Índices Actualizados

Los índices también se actualizaron para usar los nombres correctos:
- `IX_users_Auth0Id` → `IX_users_auth0_id`
- `IX_users_Email` → `IX_users_email`

### 3. Nueva Migración

Se creó una nueva migración `20250105000000_InitialCreateWithSnakeCaseColumns` que:
- Elimina las migraciones anteriores con nombres incorrectos
- Crea la tabla `users` con columnas en snake_case
- Configura correctamente el enum `user_type_enum.user_type`
- Establece los índices con nombres apropiados

## Beneficios

1. **Convención PostgreSQL**: Sigue las mejores prácticas de PostgreSQL
2. **Consistencia**: Nombres de columnas consistentes en toda la base de datos
3. **Legibilidad**: Mejor legibilidad en consultas SQL directas
4. **Mantenibilidad**: Facilita el mantenimiento y debugging

## Próximos Pasos

1. Ejecutar la migración en la base de datos:
   ```bash
   dotnet ef database update --project ./Persistence/NitroGroups.Persistence.Context --startup-project ./Services/NitroGroups.Services.Api
   ```

2. Verificar que la aplicación funcione correctamente con los nuevos nombres de columnas

3. Si hay datos existentes, considerar crear un script de migración de datos antes de aplicar los cambios

## Notas Importantes

- Los nombres de las propiedades en C# permanecen en PascalCase (no cambian)
- Solo los nombres de las columnas en la base de datos cambian a snake_case
- Entity Framework maneja automáticamente el mapeo entre ambos
- No se requieren cambios en el código de la aplicación