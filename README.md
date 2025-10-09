# NitroGroups

NitroGroups es una plataforma web diseñada para conectar músicos y grupos independientes con clientes que buscan talento para sus eventos. La plataforma permite a los artistas crear perfiles detallados, 
mostrar su trabajo a través de fotos y videos, y gestionar su disponibilidad y tarifas, mientras que los clientes pueden buscar, contactar y contratar talento de manera sencilla.

## Características Principales

- **Perfiles para Músicos y Grupos**: Cada músico puede tener un perfil individual y/o pertenecer a un grupo. Los perfiles muestran información clave, biografía, y material multimedia.
- **Búsqueda y Contratación**: Los clientes pueden buscar artistas por género, ubicación, y otros filtros para encontrar el talento perfecto para sus eventos.
- **Gestión de Disponibilidad y Precios**: Los grupos pueden configurar su calendario de disponibilidad y establecer rangos de precios para facilitar el proceso de contratación.
- **Galería Multimedia**: Los artistas pueden subir un número limitado de fotos y videos para mostrar su estilo y actuaciones pasadas.
- **Chat Integrado**: Un sistema de mensajería directa para que clientes y artistas puedan comunicarse, negociar y cerrar tratos de forma segura.

## Arquitectura del Proyecto

El proyecto sigue una **Arquitectura Hexagonal (Puertos y Adaptadores)** combinada con **Vertical Slice Architecture** para garantizar un alto desacoplamiento, cohesión y mantenibilidad.

- La **Arquitectura Hexagonal** organiza la solución a alto nivel, aislando el núcleo de la aplicación (dominio y lógica de aplicación) de las preocupaciones externas como la interfaz de usuario, la base de datos o las APIs de terceros.
- La **Arquitectura de Cortes Verticales (Vertical Slice)** organiza el código *dentro* del núcleo. En lugar de agrupar el código por capas técnicas (ej. `servicios`, `controladores`), se agrupa por funcionalidad completa o "corte vertical" (ej. `RegistrarUsuario`, `ObtenerPerfilDeGrupo`).

La estructura se divide en los siguientes proyectos principales:

- **`NitroGroups.sln`**: El archivo de solución que agrupa todos los proyectos.

- **`UI/NitroGroups.Blazor`**: La interfaz de usuario (frontend) de la aplicación, que actúa como un "adaptador" primario en la arquitectura hexagonal. Está construida con **Blazor Web App**.

- **`Apis/NitroGroups.Api`**: La API backend del proyecto. Expone los endpoints que consumen los clientes (como la app Blazor) y traduce las solicitudes HTTP en comandos y consultas para los "cortes verticales".

- **`AppHost`**: Proyecto de orquestación de **.NET Aspire** para simplificar el entorno de desarrollo local.

- **`Core/`**: Aquí reside la lógica de negocio principal. Cada módulo representa un **Contexto Delimitado (Bounded Context)** de DDD y está organizado internamente usando Vertical Slices:
    - **`Domain`**: El núcleo del hexágono. Contiene las entidades, agregados y reglas de negocio puras del dominio.
    - **`Application`**: Contiene los "cortes verticales" (casos de uso) con sus Comandos, Consultas (Queries) y Handlers. Define los "puertos" (interfaces) que necesita para comunicarse con el exterior.
    - **`Infrastructure`**: Contiene los "adaptadores" secundarios que implementan los puertos (ej. para la persistencia con EF Core, envío de emails, etc.).

- **`Shared/`**: Contiene código reutilizable que puede ser compartido entre los diferentes proyectos.

## Stack Tecnológico

- **Backend**: .NET 8, ASP.NET Core, C#
- **Frontend**: .NET 8, Blazor Web App
- **Orquestación**: .NET Aspire
- **Arquitectura**: Hexagonal Architecture, Vertical Slice
- **Base de Datos**: Entity Framework Core con PostgreSQL

## Cómo Empezar

- Lee nuestra guía de contribución [aquí](CONTRIBUTION.md).

Para ejecutar el proyecto en un entorno de desarrollo local:

1.  Clona el repositorio.
2.  Asegúrate de tener instalado el **.NET 8 SDK** (o superior) y el workload de **.NET Aspire**.
3.  Crea la base de datos con la cadena de conexión que se encuentra en el appsettings de la  api(Puedes modificar la cadena de conexión).
4.  Abre la solución en Visual Studio 2022 o superior y establece el proyecto `NitroGroups.AppHost` como proyecto de inicio.
5.  Presiona F5 para lanzar la aplicación. .NET Aspire se encargará de iniciar tanto el frontend de Blazor como la API.

Alternativamente, desde la línea de comandos:
```bash
# Navega a la carpeta del proyecto AppHost
cd AppHost/NitroGroups.AppHost

# Ejecuta el proyecto
dotnet run
```

## Ejecución de migraciones desde la consola
```bash
dotnet ef database update --project ./Persistence/NitroGroups.Persistence.Context  --startup-project ./Services/NitroGroups.Services.Api
```
## tailwindcss

Actualmente este proyecto utiliza el tailwind cli, si necesitas hacer cambios de tailwind tienes que instalarlo.

Para instalar en windows sería de esta manera: 

Desde la linea de comandos
```bash
winget install TailwindLabs.TailwindCSS
```

Y para ejecutarlo y tenerlo corriendo para ver los cambios que hagas:
```bash
# Navega a la carpeta del proyecto Blazor
cd UI/NitroGroups.UI.Blazor

#Ejecuta tailwind en modo --watch
tailwindcss -i wwwroot/css/app.css -o wwwroot/css/app.min.css -w
```