# MVP: arquitectura profesional + ciclo del cliente

Documento de feature con el protocolo ODD de Gentle-AI: Specs → Tasks → Log.
Rama de trabajo: `claude/practical-keller-qzzaaq` (a partir de `develop`).

## Specs

- **S1 — Repo limpio.** No hay orquestador de IA (`ai/`), ni proyectos o archivos huérfanos, ni dependencias muertas (Supabase).
- **S2 — Seguridad deny-by-default.** Todo endpoint exige usuario autenticado salvo los marcados explícitamente como públicos (ver grupo por slug, búsqueda, géneros, disponibilidad pública).
- **S3 — Identidad desde el token.** El usuario actual siempre se toma del JWT (`sub` → id interno). Ningún endpoint acepta `userId`, `ownerUserId` ni `auth0Id` en el cuerpo para decidir quién actúa.
- **S4 — Permisos por grupo.** Solo el Owner o un Manager activo del grupo pueden modificar el grupo, sus géneros, media, disponibilidad o solicitudes.
- **S5 — Un DbContext por módulo.** Cada módulo (Users, Groups, Schedules, Bookings) tiene su DbContext, su esquema de PostgreSQL, sus migraciones y su outbox. `Shared.*` no referencia ningún `Core.*`.
- **S6 — Comunicación entre módulos por contrato.** Un módulo solo usa otro a través de `IUsersModuleApi` o `IGroupsModuleApi` (en `Shared.Contracts.Modules`) o de eventos de integración. Tests de arquitectura lo verifican.
- **S7 — Roles en dos ejes.** `UserType` = Client | Musician. El admin se define por un claim o rol de Auth0. El rol dentro del grupo es Owner | Manager | Member.
- **S8 — Rutas REST consistentes.** `api/groups/{groupId:long}/...` en plural y con nombres uniformes.
- **S9 — Búsqueda pública de grupos** por texto, género, ciudad y rango de precio, paginada.
- **S10 — Solicitudes de evento.** Un cliente envía una solicitud a un grupo. El grupo la acepta o la rechaza y el cliente puede cancelarla. Ambas partes intercambian mensajes dentro de la solicitud y reciben un aviso por email (vía outbox).
- **S11 — CI.** Cada PR compila y prueba el backend (con PostgreSQL) y hace lint y build del frontend.

## Tasks

- [x] T1 (S1) Eliminar `ai/`, workflow y test del orquestador, archivos raíz huérfanos, `Core/Availability` y Supabase.
- [x] T2 (S5, S6) `ModuleDbContext`, outbox por módulo, DbContexts de Users/Groups/Schedules, contratos de módulo, nuevas migraciones y script de upgrade para bases existentes.
- [x] T3 (S6) Tests de arquitectura de fronteras entre módulos.
- [x] T4 (S7) Modelo de roles y migración de datos.
- [ ] T5 (S2, S3, S4) FallbackPolicy, claims transformation, filtro `RequireGroupManager`, identidad desde el token, exception handler.
- [ ] T6 (S8) Rutas de Schedules uniformes y frontend actualizado.
- [ ] T7 (S9) Búsqueda (API + página `/groups`).
- [ ] T8 (S10) Módulo Bookings (API + emails + UI).
- [ ] T9 (S11) Workflow de CI + lint del frontend en verde + docs.

## Log

- T1: hecho en `c9294fd`. Línea base antes de empezar: 81 tests en verde (40 de endpoints y 41 de integración).
- Decisión (reemplazada más abajo): al principio se adoptó solo el protocolo ODD sin instalar Gentle-AI.
- T2: un DbContext por módulo (`users`, `groups`, `schedules`) con outbox y migraciones propias; contratos `IUsersModuleApi`/`IGroupsModuleApi`; se elimina el acceso de Users a las tablas de Groups. Verificación: `dotnet build` OK; 81/81 tests OK; migraciones aplicadas sobre una base vacía; script de upgrade probado contra una base creada con `Init` de `develop` (esquema resultante idéntico al nuevo según `pg_dump -s`; datos conservados; idempotente). Rollback: revertir el commit; las bases ya migradas necesitan restaurar el backup previo.
- Decisión: Gentle-AI 4.1.1 y engram v1.20.0 se instalan de forma efímera en el contenedor (pedido del usuario). Las decisiones se exportan a `.engram/`.
- RDD sobre `4176b40`: `review assess` → riesgo medio, `review_due=false` (`under_budget`). Se cierra con `consent=declined`, sin review, siguiendo la regla del orquestador.
- T3: `ModuleBoundariesTests` (4 tests: ensamblados sin referencias entre módulos, Shared sin Core, Domain sin Application/Infrastructure/EF, `.csproj` sin referencias que crucen fronteras salvo Bootstrap). Verificación: 85/85 en verde; al inyectar a propósito `Groups.Infrastructure -> Users.Application` el test falla con el mensaje esperado.
- T4: `UserType` = Client(0) | Musician(1) y `GroupMemberRole` = Owner(0) | Member(1) | Manager(2). Migraciones `SimplifyRoleModel` (Users: BandMember→Musician, Admin→Client; Groups: Guest→Member y garantiza al dueño como Owner). El frontend mapea el flujo `band_member` a cuenta Musician. Verificación: 91/91 tests (incluye 6 nuevos de `GroupsModuleApi`), `tsc --noEmit` OK, migración probada sobre `nitro_old` con datos BandMember/Admin/Guest.
- RDD sobre `1eb515e` (feat roles): `assess` → riesgo alto (`hot_path`), consentimiento del usuario: revisar. Lentes risk + reliability → **APROBADA** (lineage `review-7e8b9fe3afebb5ef`, acknowledged). Risk sin hallazgos. Reliability con 4 WARNING no bloqueantes, para después:
  - R3-fixed-slug-seed: el seed de `GroupsModuleApiIntegrationTests` usa un slug fijo; frágil si el fixture comparte la base. → se resuelve en T5.
  - R3-owner-not-seeded-as-member: el test no cubre al Owner como `GroupMember` con rol Owner. → se resuelve en T5.
  - R3-removed-enum-names-deserialization: los clientes que envíen "BandMember"/"Admin" como string reciben 400. Mitigado en el frontend; se documenta en el changelog del PR.
  - R3-migration-magic-joinedvia: el backfill usa `joined_via = 2` literal (Manual). → se agrega un comentario en la migración en T5.
