# Changelog del Orquestador

Historial de cambios del orquestador `ai/`. Formato [Keep a Changelog](https://keepachangelog.com/)
con SemVer adaptado a la iteración interna.

Convención:
- **Added** — funcionalidad nueva.
- **Changed** — cambio de comportamiento existente.
- **Fixed** — corrección de bug (idealmente con link a `INCIDENTS.md`).
- **Removed** — funcionalidad eliminada.
- **Security** — cambios de seguridad.

---

## [1.0.6] — 2026-04-21

### Changed
- Prompt frontend: ejemplo obligatorio de `Intl.DateTimeFormat` como
  sustituto de `date-fns` (ataque directo a la alucinación más frecuente
  observada en runs 3 / 4 / 5 / 6).
- Prompt backend: ejemplo obligatorio de Response DTO completo con TODOS
  los campos del contrato, para reducir la carga del repair dirigido
  (que igual los recupera, pero es trabajo evitable).

---

## [1.0.5] — 2026-04-21

### Fixed
- **[INC-20260421-10]** Allowlist backend para atrapar `using` alucinados
  (EF Core en Application, `SchedulesDbContext`, `NitroGroups.Core.Common`)
  antes del quality gate. Clasifica issues por capa (Application / Infrastructure
  / Domain) y dispara `buildDeterministicBackend` vía `recoverInvalidOutput`.
  Elimina el desperdicio de 3 rondas LLM en errores estructurales no reparables.
  Archivos:
  - `ai/tasks/generateFeature.ts` (constantes + `detectHallucinatedBackendImports`)
  - `ai/prompts/backendArchitecturePrompt.ts` (sección "ALLOWLIST DE NAMESPACES"
    + plantilla obligatoria de Query Handler con Repository inyectado).

### Validated
- **RUN-20260421-06**: segunda corrida verde consecutiva ✅. 2 llamadas LLM,
  0 rondas de autocorrección, 9 archivos desplegados. Confirma que el
  comportamiento production-ready es replicable. Ver `INCIDENTS.md`.

---

## [1.0.4] — 2026-04-21

### Changed
- Prompt backend endurecido (preventivo, tras RUN-20260421-04):
  - Obliga a implementar `IQuery<Result<TResponse>>` / `ICommand<Result<TResponse>>`
    con el TResponse exacto del contrato (evita el `CS0311` visto en runs anteriores).
  - Obliga a incluir TODOS los campos del contrato en el Response DTO
    (evita que el repair tenga que inyectar campos omitidos).
  - Explicita que Request+Response+Query+Handler viven en la MISMA carpeta/namespace;
    prohíbe subcarpetas `/Requests` o `/Responses`.
  Archivo: `ai/prompts/backendArchitecturePrompt.ts`.

### Validated
- **RUN-20260421-04**: primera corrida production-ready ✅. Cero autocorrecciones LLM,
  9 archivos desplegados, Quality Gates verdes al primer pass. Ver `INCIDENTS.md`.

---

## [1.0.3] — 2026-04-21

### Fixed
- **[INC-20260421-08]** Removido `gpt-oss-120b` de `CEREBRAS_MODELS`: retorna
  404 para la key libre actual aunque aparezca en `/v1/models`. Solo quedan
  los dos que sí responden: `qwen-3-235b-a22b-instruct-2507` y `llama3.1-8b`.
  Archivo: `ai/.env`.
- **[INC-20260421-09]** Prompt frontend endurecido con ALLOWLIST explícita
  de paquetes y aliases (casing + export type). Validador pre-flight agrega
  `detectHallucinatedFrontendImports` que detecta imports fuera de la
  allowlist y los trata como issue `kind: "frontend"` → dispara recuperación
  determinista.
  Archivos:
  - `ai/prompts/frontendArchitecturePrompt.ts`
  - `ai/tasks/generateFeature.ts` (allowlist + detector)

---

## [1.0.2] — 2026-04-21

### Fixed
- **[INC-20260421-06]** `CEREBRAS_MODELS` actualizado al catálogo real actual
  (`gpt-oss-120b`, `qwen-3-235b-a22b-instruct-2507`, `llama3.1-8b`). El
  modelo `llama-3.3-70b` ya no existe en Cerebras.
  Archivo: `ai/.env`.
- **[INC-20260421-07]** `validateGeneratedOutput` ahora clasifica issues
  (`fatal` / `frontend` / `backend`) y aplica `recoverInvalidOutput` con
  fallback determinista antes de abortar. Errores de imports ya no hard-fallan
  la ejecución.
  Archivo: `ai/tasks/generateFeature.ts`.

---

## [1.0.1] — 2026-04-21

### Fixed
- **[INC-20260421-04]** Cadena LLM ahora salta al siguiente proveedor (no solo
  al siguiente modelo del mismo) cuando el rate-limit excede
  `LLM_LONG_RATE_LIMIT_MS` (default 60s).
  Archivo: `ai/client.ts` (labels `providerLoop:` / `modelLoop:`).
- **[INC-20260421-05]** Backend determinista coloca DTOs en el mismo folder
  y namespace que Query/Handler/Endpoint, eliminando errores CS0246 por
  `using` cruzados olvidados.
  Archivo: `ai/orchestrator/generation/backendFallback.ts`.
- Smoke test actualizado con assertion que verifica ausencia de subcarpetas
  `/Requests` o `/Responses` en el output determinista.
  Archivo: `ai/orchestrator/__smokeTest.ts`.

### Added
- Documentación oficial del orquestador en `ai/docs/`:
  - `README.md` (índice + convenciones).
  - `ARCHITECTURE.md` (v1.0 arquitectura, flujo, ahorro de tokens).
  - `PROVIDERS.md` (cadena LLM, tuning, diagnóstico).
  - `INCIDENTS.md` (bitácora de incidentes históricos).
  - `CHANGELOG.md` (este archivo).

---

## [1.0.0] — 2026-04-21

### Added — Arquitectura v1.0 production-ready
- `ai/orchestrator/types.ts`: tipos compartidos (`FileOutput`, `B2BContract`,
  `OrchestratorMode`, `StructuralIssue`, utilidades).
- `ai/orchestrator/contract/structuralValidator.ts`: validación B2B AST-light
  por archivo/DTO (C# y TS), reemplaza el string-match anterior.
- `ai/orchestrator/contract/contractRepair.ts`: reparación dirigida in-place
  de campos faltantes en DTOs reales (C# record posicional, class block,
  TS interface). **Elimina el hack de patch files sintéticos.**
- `ai/orchestrator/generation/backendFallback.ts`: generación determinista
  de backend .NET vertical slice (Query/Handler/Endpoint/DTOs) compilable.
- `ai/orchestrator/generation/frontendFallback.ts`: extracción y refino del
  fallback determinista frontend existente.
- `ai/orchestrator/generation/parser.ts`: utilidades de parseo multi-file
  del output LLM y merge de archivos generados.
- `ai/orchestrator/pipeline/modes.ts`: modos de ejecución explícitos
  (`full-stack` | `frontend-only` | `contract-only`) con config por modo.
- `ai/orchestrator/__smokeTest.ts`: smoke test end-to-end sin LLM
  (valida el pipeline determinista contra contrato real).
- `ai/providers/`: cadena multi-proveedor completa
  (`groq`, `cerebras`, `gemini`, `ollama`) con:
  - Interface `LLMProvider` + `RateLimitError`.
  - `OpenAICompatibleProvider` base (parsing de retry-after, ping).
  - `registry.ts` que ordena la cadena desde `AI_PROVIDER_ORDER`.
- CLI: comando `npm run ai providers` para diagnóstico de la cadena.
- CLI: flag `--mode` para seleccionar modo de orquestación.

### Changed
- `ai/client.ts` refactorizado: sin `OpenAI` directo; itera proveedores de
  la cadena con política de failover por rate-limit.
- `ai/tasks/generateFeature.ts` refactorizado para usar los módulos nuevos:
  - `validateGeneratedOutput` respeta `OrchestratorMode`.
  - `collectQualityBaseline`/`runQualityGates` respetan el modo.
  - `runAutoRepairLoop` con fallbacks en cascada:
    1. Fallback frontend determinista.
    2. Fallback backend determinista (nuevo).
    3. Degradación a frontend-only si backend sigue roto en full-stack.

### Fixed
- **[INC-20260421-03]** Eliminados archivos `B2BContractPatch_*` que no
  resolvían el problema real; ahora se inyectan campos en el DTO real.

---

## [0.9.x] — 2026-04-20

### Added
- Rate-limit handling básico con backoff exponencial en `ai/client.ts`.
- Engram memory CLI-first con fallback HTTP/local (`ai/memory/engramClient.ts`).
- `collectQualityBaseline`/`getNewDiagnostics` para comparar errores nuevos
  vs existentes.
- Transactional file writes con rollback si validación falla.
- `applyDeterministicFrontendFallback` (v0, solo frontend).
- `sanitizeProtectedFiles` para evitar overwriting de entidades del dominio.

### Changed
- Prompts (`frontendArchitecturePrompt.ts`, `backendArchitecturePrompt.ts`)
  con imports obligatorios explícitos.
- `resolveDomainContext` (`ai/utils/contextExtractor.ts`) con scoring robusto.

### Fixed
- **[INC-20260420-01]** Frontend generado ahora importa `@tanstack/react-query`.
- **[INC-20260420-02]** Contrato `availability.contract.json` corregido.
- **[INC-20260420-03]** Context extractor resuelve correctamente
  `availability` → `Schedules`.
- **[INC-20260420-04]** Quality Gate distingue errores nuevos vs baseline.
- **[INC-20260420-05]** Engram memory disponible (instalado localmente).
- **[INC-20260421-01]** Rate-limits largos de Groq no bloquean el run.
- **[INC-20260421-02]** Ollama usa `qwen2.5-coder:3b-instruct` por default.

---

## [0.1.0] — inicio

Versión inicial: orquestador mono-archivo con prompts hardcodeados, cliente
Groq único, sin validación estructural, sin fallbacks deterministas.
