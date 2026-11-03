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
- [x] T5 (S2, S3, S4) FallbackPolicy, claims transformation, filtro `RequireGroupManager`, identidad desde el token, exception handler.
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
- T5: `FallbackPolicy` autenticada + política `Admin` (rol de Auth0); `NitroClaimsTransformation` (sub → `nitro:user_id`, roles de Auth0 → `ClaimTypes.Role`); `ICurrentUserService` lee solo claims; filtro `RequireGroupManager` (401 sin registrar, 404 sin grupo, 403 sin permiso) en todas las escrituras de grupo, media, géneros y horarios; `POST api/groups`, `auth/sync` y `musicians` toman la identidad del token antes de validar; `GET/POST api/users` solo admin; `users/auth0/{id}` solo el propio usuario o un admin. El exception handler queda primero en el pipeline y sin detalle fuera de Development; health y OpenAPI anónimos. Frontend: interceptor que adjunta el token en `apiClient` (`groupAvailability.service` no lo enviaba) y `login/route.ts` envía Bearer a `/auth/sync`. Bug latente de tests corregido: `IDbContextOptionsConfiguration<T>` dejaba Npgsql junto a InMemory. Se resuelven los WARNING R3-fixed-slug-seed, R3-owner-not-seeded-as-member y R3-migration-magic-joinedvia. Verificación: 126/126 tests (26 de seguridad + 4 de claims); sabotaje: un `.AllowAnonymous()` no declarado hace fallar la allowlist; runtime contra Postgres: públicos 200/404, privados 401 (también con token inválido); `tsc` OK.
- RDD sobre `7f9b2c2` (feat security): riesgo alto, consentimiento: revisar. Lentes risk + reliability → **APROBADA** (acknowledged) con 3 hallazgos de risk y 6 de reliability no bloqueantes. Se resuelven en la unidad siguiente porque son de seguridad:
  - R1-sub-resource-group-binding → **IDOR real** en `DeleteGroupAvailabilityCommandHandler` (no validaba el grupo del ítem). Corregido con test que lo reproduce. El resto de los handlers ya lo validaba.
  - R1/R3 sync-email-from-body → el email se lee del claim `https://nitrogroups.com/email` (Action de Auth0 documentada en el README); sin claim queda `EmailVerified=false`.
  - R3-musician-filter-null-userinfo → `userInfo` nulo devuelve 400 (test).
  - R3-timing-dependent-cache-test → el "no existe" ya no se cachea; test determinista + test de caché.
  - R3-admin-bypass-untested / getbyauth0-admin → el admin pasa antes del chequeo de sincronización; 3 tests.
  - R1-browser-token-cache / R3-anon-token-fetch → caché por `exp` del JWT, se limpia con 401 y logout, el anónimo se cachea 5 s.
