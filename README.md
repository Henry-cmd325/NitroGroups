# NitroGroups

NitroGroups es una plataforma web diseñada para conectar músicos y grupos independientes con clientes que buscan talento para sus eventos. La plataforma permite a los artistas crear perfiles detallados, 
mostrar su trabajo a través de fotos y videos, y gestionar su disponibilidad y tarifas, mientras que los clientes pueden buscar, contactar y contratar talento de manera sencilla.

## Características Principales

- **Perfiles para Músicos y Grupos**: Cada músico puede tener un perfil individual y/o pertenecer a un grupo. Los perfiles muestran información clave, biografía y material multimedia.
- **Búsqueda y Contratación**: Los clientes pueden buscar artistas por género, ubicación y otros filtros para encontrar el talento perfecto para sus eventos.
- **Gestión de Disponibilidad y Precios**: Los grupos pueden configurar su calendario de disponibilidad y establecer rangos de precios para facilitar el proceso de contratación.
- **Galería Multimedia**: Los artistas pueden subir un número limitado de fotos y videos para mostrar su estilo y actuaciones pasadas.
- **Chat Integrado**: Un sistema de mensajería directa para que clientes y artistas puedan comunicarse, negociar y cerrar tratos de forma segura.

## Arquitectura del Proyecto

El proyecto sigue una **Arquitectura Hexagonal (Puertos y Adaptadores)** combinada con **Vertical Slice Architecture** para garantizar un alto desacoplamiento, cohesión y mantenibilidad.

- La **Arquitectura Hexagonal** organiza la solución a alto nivel, aislando el núcleo de la aplicación (dominio y lógica de aplicación) de las preocupaciones externas como la interfaz de usuario, la base de datos o las APIs de terceros.
- La **Arquitectura de Cortes Verticales (Vertical Slice)** organiza el código *dentro* del núcleo. En lugar de agrupar el código por capas técnicas (ej. `servicios`, `controladores`), se agrupa por funcionalidad completa o "corte vertical" (ej. `RegistrarUsuario`, `ObtenerPerfilDeGrupo`).

Estructura principal:

- **`NitroGroups.slnx`**: Archivo de solución que agrupa los proyectos .NET.
- **`UI/nitro-groups`**: Frontend en **Next.js 16** (React 19, TypeScript). Actúa como adaptador primario.
- **`Services/NitroGroups.Services.Api`**: API backend en ASP.NET Core que expone los endpoints consumidos por el frontend.
- **`AppHost`**: Proyecto de orquestación con **.NET Aspire** para el entorno local del backend.
- **`Core/`**: Lógica de negocio por contexto delimitado usando vertical slices:
  - **`Domain`**: Entidades, agregados y reglas de negocio.
  - **`Application`**: Casos de uso (comandos/consultas) y puertos.
  - **`Infrastructure`**: Adaptadores secundarios por contexto.
- **`Shared/`**: Código reutilizable y transversal (abstracciones, contratos, endpoints, paginación y utilidades). La infraestructura compartida incluye la **persistencia** (EF Core) dentro de `Shared/NitroGroups.Shared.Infrastructure/Context` y `Repository`.

## Stack Tecnológico

- **Backend**: .NET 10, ASP.NET Core, C#
- **Frontend**: Next.js 16 (React 19, TypeScript)
- **Orquestación**: .NET Aspire
- **Arquitectura**: Hexagonal Architecture, Vertical Slice
- **Base de Datos**: Entity Framework Core con PostgreSQL

## Cómo Empezar

- Lee nuestra guía de contribución [aquí](CONTRIBUTION.md).

### Requisitos previos
- **.NET 10 SDK** y workload de **.NET Aspire**.
- **Node.js 18.18+** (o superior) y **npm**.

### Ejecución unificada (Aspire)
Aspire levanta la API y el frontend en un solo comando:
```bash
cd AppHost/NitroGroups.AppHost
dotnet run
```

### Backend (.NET) por separado
1. Clona el repositorio.
2. Configura la cadena de conexión en `appsettings` de `Services/NitroGroups.Services.Api`.
3. Ejecuta solo la API:
   ```bash
   cd Services/NitroGroups.Services.Api
   dotnet run
   ```

### Frontend (Next.js) por separado
1. Instala dependencias y levanta el dev server:
   ```bash
   cd UI/nitro-groups
   npm install
   npm run dev
   ```

## Ejecución de migraciones desde la consola
```bash
dotnet ef database update --project ./Shared/NitroGroups.Shared.Infrastructure --startup-project ./Services/NitroGroups.Services.Api
```

## Tailwind CSS

El frontend usa **Tailwind CSS 4** integrado en el flujo de build de Next.js. Para ver los estilos en caliente basta con ejecutar `npm run dev` en `UI/nitro-groups`; para builds de producción se ejecuta automáticamente con `npm run build`.
