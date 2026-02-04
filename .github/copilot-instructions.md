# NitroGroups – Copilot agent onboarding

## High-level overview
- **Purpose**: NitroGroups connects musicians/bands with clients. Backend exposes booking/search APIs; frontend is Next.js for the web app; AppHost (Aspire) orchestrates local API + frontend.
- **Tech stack**: .NET 10 (C#), ASP.NET Core API, EF Core + PostgreSQL, .NET Aspire for local composition, Next.js 16 (React 19, TS), Tailwind 4. Centralized NuGet versions via `Directory.Packages.props`.
- **Repo shape**: Monorepo with backend (`Core`, `Shared`, `Services`), orchestration (`AppHost`), frontend (`UI/nitro-groups`), persistence helpers (`Persistence`). Solution file: `NitroGroups.slnx`.

## Build, run, and validate
### Backend/API + AppHost
- **Prereqs**: .NET 10 SDK + Aspire workload; PostgreSQL connection string in API `appsettings` (see `Services/NitroGroups.Services.Api/appsettings.json`).
- **Restore/Build**: From repo root run `dotnet build NitroGroups.slnx` (succeeds in ~6s). If restore needed, `dotnet restore NitroGroups.slnx` first.
- **Run (Aspire unified)**: `cd AppHost/NitroGroups.AppHost; dotnet run`. This starts API + frontend and wires `Auth0__Authority/Audience` for API + `NEXT_PUBLIC_API_BASE_URL` for frontend.
- **Run API alone**: `cd Services/NitroGroups.Services.Api; dotnet run`. Ensure `Auth0` and DB connection strings are set.
- **EF migrations**: `dotnet ef database update --project ./Shared/NitroGroups.Shared.Infrastructure --startup-project ./Services/NitroGroups.Services.Api`.
- **Tests**: No explicit test command observed; default would be `dotnet test NitroGroups.slnx`.

### Frontend (Next.js)
- **Prereqs**: Node 18.18+.
- **Install deps**: PowerShell requires `;` separators: `cd UI/nitro-groups; npm install` (works, 6s). Using `&&` fails in this shell.
- **Dev server**: From `UI/nitro-groups`, `npm run dev` (defaults to port 3000). For production, `npm run build` then `npm start`.

## Project layout highlights
- `AppHost/AppHost.AppHost/AppHost.cs`: Aspire app wiring API + JS app, sets Auth0 env vars, health check `/health`.
- `Services/NitroGroups.Services.Api/Program.cs`: API composition—Serilog, CORS, Auth0 JWT bearer, shared infrastructure, Users/Groups modules, Swagger in Development, exception handler.
- `Core/*`: Domain/application/infrastructure per bounded context (Users, Groups) plus bootstrap project.
- `Shared/*`: Cross-cutting abstractions, contracts, endpoint mapping, infrastructure (EF Core, events, etc.).
- `UI/nitro-groups`: Next.js app (`package.json`, `eslint.config.mjs`, `next.config.ts`, `src/` pages/components). Also contains `.env.local` sample.
- Root docs: `README.md` (architecture + quickstart), `CONTRIBUTION.md` (commit message conventions), `GEMINI.md` (additional docs), `.gitignore`.
- CI/CD: `.github/workflows` exists but is empty (no automated checks configured).

## Working tips
- Prefer AppHost for full-stack local runs; otherwise run API + frontend separately with matching `NEXT_PUBLIC_API_BASE_URL`.
- Keep configs in sync: Auth0 settings via env (`Auth0__Authority`, `Auth0__Audience`) and API `appsettings`; DB connection string `ConnectionStrings:NitroGroupsConnection`.
- If PowerShell, use `;` for command chaining (e.g., `cd UI/nitro-groups; npm install`); `&&` causes parser errors.
- Trust these instructions first; only search the repo when information is missing or appears incorrect.
