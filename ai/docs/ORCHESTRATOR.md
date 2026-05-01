# Orquestador NitroGroups — runbook

Guía mínima para operar, depurar y automatizar el paquete `ai/` (generación B2B y wire-in de features).

## Requisitos

- Node 18+ y `npm install` en la **raíz del monorepo** (donde está `package.json` con el script `ai`).
- **.NET** con solución en `NitroGroups.sln` (o equivalente) si ejecutas `full-stack` o quality gates con build.

## Entorno

| Variable | Uso |
|----------|-----|
| `DEEPSEEK_API_KEY` / `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `GEMINI_API_KEY` | Al menos un proveedor; o **Ollama** local. Sin ninguno, `generateCode` falla *salvo* que uses `setGenerateCodeOverride` (tests). |
| `AUTO_ACCEPT` | Si es `true`, las confirmaciones de `diffViewer` aceptan automáticamente (CI / integración). |
| `ORCH_SANDBOX_RETENTION_DAYS` | Días de retención de snapshots en `ai/orchestrator/.../sandbox` (defecto 7). |

Otras claves puntuales viven en `ai/.env` (cargado por `ai/index.ts` vía `dotenv`).

## Comandos CLI

Desde la raíz del repo:

```bash
npm run ai -- generate-feature <feature> [--dry-run] [--update-hash] [--mode=full-stack|frontend-only|contract-only]
```

- **`--dry-run`**: no escribe al disco; calcula veredicto simulado y deja snapshot en sandbox (exit 0 si el flujo termina con verdict `dry-run`).
- **`--update-hash`**: reescribe `entityHash` en el contrato y **sale** sin generar (útil si hubo drift intencional en la entidad).

Códigos de salida: ver `ai/cli/exitCodes.ts` y el banner de `ai/index.ts` (`0` = OK/real/dry-run, `2` partial, `3` stub, `4` failed, `5` aborted, `10` excepción no controlada).

## Tests del orquestador (sin claves)

| Script | Qué hace |
|--------|----------|
| `npm run orchestrator:smoke` | Validación de piezas deterministas, repair, B2B (no llama a `generateFeature` completo). |
| `npm run orchestrator:integration` | `generateFeature("groupAvailability", { dryRun: true, mode: "frontend-only" })` con **override** de `generateCode` a respuesta vacía: comprueba el pipeline con fallbacks, sin tocar el disco. |
| `npm run orchestrator:integration` + `npx tsc --noEmit -p ai/tsconfig.json` | Recomendado antes de merge. |

**Hook de prueba** (`ai/client.ts`): `setGenerateCodeOverride(fn | null)` reemplaza todas las llamadas a `generateCode` mientras esté fijado. En producción debe permanecer en `null`.

## Documentación de diseño y backlog

- Plan de evolución (AST, E2E ampliado): `ai/docs/PLAN_V1_2.md`
- Registro de cambios: `ai/docs/CHANGELOG.md`
- Incidencias: `ai/docs/INCIDENTS.md`
