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

## [1.2.6] — 2026-04-23 — Operación: integración y documentación

### Added
- `setGenerateCodeOverride` / `GenerateCodeOverride` en `ai/client.ts` — permite
  E2E del pipeline sin claves LLM (tests, CI); debe ser `null` en producción.
- `ai/orchestrator/__integrationTest.ts` — `generateFeature` en
  `dryRun` + `frontend-only` con override a respuesta vacía (sin escritura
  a disco, sin exigir hash de entidad con backend apagado).
- `ai/docs/ORCHESTRATOR.md` — runbook (entorno, CLI, códigos de salida, scripts).
- Scripts npm: `orchestrator:smoke`, `orchestrator:integration`, `orchestrator:test`.

### Changed
- `package.json` (raíz) — entradas de script anteriores.

---

## [1.2.5] — 2026-04-23 — Refactor v1.2 — Sesión 5 (persistencia a disco)

### Added
- `ai/orchestrator/phases/persistPhase.ts` — `runPersistToDiskPhase`:
  confirmación del usuario, reconciliación de huérfanos, escritura de
  `FileOutput[]`, quality gate final, rollback de disc + reconcile, y
  reporte/veredicto parcial si el QG final falla (antes estaba inline en
  `generateFeature`).

### Changed
- `ai/tasks/generateFeature.ts` 494 → 440 líneas: delega en
  `runPersistToDiskPhase`; deja de importar `runQualityGates` directo,
  `fileReconciler` (salvo vía fase) y `rollbackWrittenFiles` en el task.

### Known limitations
- Dry-run, snapshot a sandbox y `runVerdictPhase` siguen en el task
  (orquestación fina, ~100 líneas).

---

## [1.2.4] — 2026-04-23 — Refactor v1.2 — Sesión 4 (validación, B2B, autocorrección)

### Added
- `ai/orchestrator/phases/generatedOutputPhase.ts` — `validateGeneratedOutput`,
  `recoverInvalidOutput`, `sanitizeProtectedFiles` (namespaces backend,
  allowlist frontend, reglas de rutas).
- `ai/orchestrator/phases/structuralB2BPhase.ts` — `runStructuralB2BPhase`
  (validación estructural B2B, repair dirigido, fallbacks si sigue roto;
  `rememberError` en fallo final).
- `ai/orchestrator/phases/autoRepairLoopPhase.ts` — `runAutoRepairLoop`,
  `validateFilesWithRollback`, `rollbackWrittenFiles` (reparación IA +
  fallbacks; reexporta `QualityBaseline`).

### Changed
- `ai/tasks/generateFeature.ts` reescrito sobre las fases anteriores
  (sesiones 1–3) + las nuevas: el task queda en ~494 líneas, centrado en
  contrato, impacto, generación, y el “pegamento” dry-run / confirm /
  reconcile / write / verdict.

---

## [1.2.3] — 2026-04-23 — Refactor v1.2 — Sesión 3 (lecciones + LLM + parse)

### Added
- `ai/orchestrator/phases/promptContextPhase.ts` — `buildPromptLessonContext`
  (digest por capa + bloques para backend/frontend + decisiones Engram) y
  `logPromptLessonSummary`.
- `ai/orchestrator/phases/llmGenerationPhase.ts` — `runLlmGenerationPhase`:
  prompts, `generateCode`, `parseMultiFileOutput`, fallbacks y top-up
  determinista si falta `Core/` o `UI/`. El prompt frontend usa
  `getFrontendArchitecturePrompt(contractStr, { projectRoot })` para
  allowlist UI dinámica.

### Changed
- `ai/tasks/generateFeature.ts` 1091 → 1032 líneas (−59); eliminados imports
  directos de `getBackendArchitecturePrompt` / `getFrontendArchitecturePrompt`
  y de `digestLessons` / `formatLessonsForPrompt` en el task (viven en las
  fases).

### Known limitations
- El LLM de **autocorrección** (`runAutoRepairLoop`) sigue en
  `generateFeature.ts` (Sesión 4).

---

## [1.2.2] — 2026-04-23 — Refactor v1.2 — Sesión 2 (módulo, hash, quality gates)

### Added
- `ai/orchestrator/phases/moduleContextPhase.ts` — resolución de
  `moduleName` y `domainContext` (misma lógica que el monolito, incl.
  fallback por `Add*Module` en `Program.cs`); `validateEnforcedBackendModule`
  y `enforceBackendModuleOrReport` para el bloque “módulo obligatorio”.
- `ai/orchestrator/phases/entityHashPhase.ts` — `runEntityHashPhase`
  (`--update-hash`, drift, `validateContractVsEntity`) y
  `reportEntityHashDrift` para mensajes de drift.
- `ai/orchestrator/pipeline/qualityGatesCore.ts` — baseline (`collectQualityBaseline`)
  y `runQualityGates` más helpers: `runCommandCapture`, `extractDiagnostics`,
  `getNewDiagnostics`.

### Changed
- `ai/tasks/generateFeature.ts` 1263 → 1091 líneas (−172) delegando a los
  módulos anteriores; se elimina duplicación de `getRegisteredModulesFromProgram` /
  `extractDomainContextFromModule` (ahora con `projectRoot` explícito en el
  módulo de fase).

### Known limitations
- `validateFilesWithRollback` y `runAutoRepairLoop` siguen en
  `generateFeature.ts` (requieren fases 3–4 del plan).

---

## [1.2.1] — 2026-04-21 — Refactor parcial de `generateFeature.ts`

### Added
- `ai/orchestrator/phases/` — nuevo directorio para las fases del
  pipeline extraídas del monolito `generateFeature.ts`. Cada fase es un
  módulo independiente con input/output tipados.
  - `pipelineContext.ts` — interfaces `PipelineBaseContext`,
    `PipelineModuleContext`, `PipelineGenerationContext`, `PhaseHalt`.
    Base para el refactor completo (v1.2 §2 del PLAN).
  - `draftingPhase.ts` — fase A (diseño asistido cuando no existe
    contrato). Extraída tal cual desde `generateFeature.ts`.
  - `impactPhase.ts` — fase de análisis de impacto (`runImpactAnalysis`
    + confirmación interactiva en riesgo alto). Soporta
    `nonInteractive: true` para dry-run/tests.
  - `wireInPhase.ts` — fachada para `planFrontendWireIn` con el logging
    estándar y el merge de archivos.
  - `verdictPhase.ts` — fase final: success.json, detectHandlersRealism,
    rememberSuccess, buildVerdictReport, stampSandbox, verdicts.jsonl.

### Changed
- `ai/tasks/generateFeature.ts` pasa de 1384 a 1263 líneas (−121). Ahora
  delega drafting, impact, wire-in y verdict a sus respectivas fases.
  Imports huérfanos (`runImpactAnalysis`, `extractDbSchema`,
  `rememberDecision`, `rememberSuccess`, `detectHandlersRealism`,
  `planFrontendWireIn`, `extractJsonFromResponse`) removidos.
- El log `success.json` ahora también grava el campo `risk` con el
  resultado de `impactPhase` (antes leía directo de `impact.risk`).

### Known limitations
- El núcleo del orquestador (resolución de módulo, domain context, hash
  drift, quality baseline, construcción de prompts, loop LLM + repair,
  sandbox + write + rollback) SIGUE inline en `generateFeature.ts`.
  Extraerlo requiere 2–2.5 días más y debe hacerse en paralelo con el
  framework de tests de integración (§3 del PLAN) para no romper el
  verdict honesto. Ver `PLAN_V1_2.md` §2 para el roadmap detallado.

---

## [1.2.0] — 2026-04-22 — Hardening estructural (cierre de deuda v1.1)

### Added
- `ai/orchestrator/pipeline/fileReconciler.ts` — reconciliación de archivos
  huérfanos. Antes de escribir el set final, detecta `.cs`/`.ts`/`.tsx` que
  viven en los scopes de la feature pero NO están en el set final y los
  borra. Incluye rollback si el quality gate final falla. Elimina la basura
  silenciosa en el repo cuando LLM + fallback producen paths distintos.
- `ai/orchestrator/generation/uiComponentIntrospector.ts` — introspección
  del directorio `UI/nitro-groups/src/components/ui/` para detectar en
  runtime: default/named exports, interfaces Props, y variants CVA. El
  `frontendNormalizer` usa esta introspección en lugar de la lista
  hardcodeada anterior. El `uiAllowlist` del prompt frontend también
  se genera desde aquí, así que añadir un componente UI nuevo no requiere
  editar ni el normalizer ni el prompt.
- `ai/memory/errorDigest.ts` — digest compacto de errores pasados desde
  `errors.json`. Normaliza mensajes (quita paths/líneas), agrupa por
  huella, clasifica por capa (backend/frontend/contract/build) y rankea
  por recencia + frecuencia + mismo feature. Formatea como bloque
  markdown para inyectar al prompt. Cierra el loop de memoria:
  `rememberError` ahora tiene efecto real sobre los prompts futuros.
- `ai/prompts/shared/uiAllowlist.ts` + `backendTypeMapping.ts` — allowlists
  y tablas de tipos extraídas como constantes reutilizables. Los prompts
  ya no hardcodean las listas; se generan dinámicamente desde las
  mismas fuentes que usan validators y fallbacks.
- `ai/cli/exitCodes.ts` — exit codes estandarizados:
  - 0 OK (incluye dry-run), 1 CLI usage, 2 partial, 3 stub, 4 failed,
    5 aborted, 10 unexpected. Listo para usar en CI.
- `ai/cli/envGuard.ts` — al inicio de cualquier comando, avisa si
  `ai/.env` está trackeado por git o no está en `.gitignore`.
- `--dry-run` en `generate-feature`: simula el run completo sin
  escribir archivos. Devuelve exit code 0 si hipotéticamente habría
  pasado las quality gates.
- `ai/docs/PLAN_V1_2.md` — plan de trabajo para los 3 items de deuda
  estructural que quedan (AST parsing, refactor de `generateFeature.ts`,
  tests de integración con LLM mockeado). Estimación total: ~10 días.

### Changed
- `handlerInspector.ts` — pasa de heurística binaria (DI + repo + await) a
  **sistema de señales** con scoring. Un handler se clasifica como "real"
  si suma >= 2 puntos entre: DI, llamada a repo/context, await, mapeo
  multi-campo entity→DTO, señal de persistencia (SaveChanges/Commit),
  LINQ sobre inyectado. Acepta handlers sync y más patrones.
- `getFrontendArchitecturePrompt(contract)` → `getFrontendArchitecturePrompt(contract, options?)`.
  `options.projectRoot` permite inyectar un root distinto en tests. El
  bloque de aliases se genera desde `uiComponentIntrospector`.
- `getBackendArchitecturePrompt` — la tabla de mapeo JSON → C# se genera
  desde `backendTypeMapping.ts` (fuente única). Ahora también se puede
  consumir programáticamente vía `lookupCsharpType(type, format)`.
- `generateFeature()` — firma: ahora devuelve `Promise<GenerateFeatureResult | void>`.
  El resultado incluye `verdict` (`real|partial|stub|failed|aborted|dry-run`)
  y se mapea a exit code en `index.ts`.
- Prompts de backend y frontend ligeramente más compactos (~80 líneas
  menos en total) porque las tablas se generan y no se duplican.

### Fixed
- Archivos huérfanos del LLM que quedaban en el árbol cuando el fallback
  determinista los reemplazaba (ver `INC-20260422-04`).
- Normalizer frontend ahora se auto-ajusta si se añade un componente UI
  nuevo al proyecto. Ya no requiere editar listas hardcoded.
- Memoria de errores ahora se consume como contexto de prompt (antes
  se escribía a disco pero nunca se leía para influenciar generaciones).

### Known limitations (v1.2 intencionales)
- El parsing de C#/TS sigue siendo por regex. Ver `PLAN_V1_2.md` §1
  para migrar a `ts-morph` + Roslyn CLI.
- `generateFeature.ts` sigue grande (~1350 líneas). Ver `PLAN_V1_2.md` §2
  para el split en fases.
- No hay tests de integración con LLM mockeado. Ver `PLAN_V1_2.md` §3.

---

## [1.1.3] — 2026-04-22 — Normalizer determinista de salida frontend

### Added
- `ai/orchestrator/generation/frontendNormalizer.ts` — normalizer que
  corrige patrones recurrentes de la salida LLM sin tocar la lógica/JSX:
  - **Imports default ↔ named**: si el LLM escribe
    `import { Card } from "@/components/ui/Card"` cuando `Card` es default,
    se reescribe a `import Card from ...`; e inversa para `Button`, `Input`,
    `Alert`, `ProgressSteps` que son named. Tabla `UI_ALIASES` espeja los
    exports reales del proyecto.
  - **Named imports fantasma**: `CardHeader`, `CardTitle`, `CardContent`,
    etc. se descartan porque el `Card` del proyecto tiene API
    `{ header, children, footer }`.
  - **Badge variants inválidas**: `success → secondary`, `info → outline`,
    `warning → secondary`, `error/danger → destructive`, `primary → default`.
  - **Badge sin import**: si el JSX usa `<Badge>` pero no hay import, se
    inyecta `import Badge from "@/components/ui/Badge"`.
  - **Panel sin default export**: si el Panel usa
    `export const <Feature>Panel`, se añade `export default <Feature>Panel`
    al final. Elimina la ambigüedad con el `page.tsx` del wire-in.
- Se aplica en dos momentos: (1) tras generación inicial (antes de validación
  B2B) y (2) tras cada ronda de autocorrección IA, para evitar que la IA
  reintroduzca los mismos bugs.
- Smoke test 8b: verifica los 6 casos (default import, named import, import
  fantasma removido, Badge variant, Badge import inyectado, panel default
  export).

### Changed
- `frontendWireIn.ts` simplificado: ahora siempre prefiere default import
  (el normalizer garantiza default export). Fallback a named si por alguna
  razón no hay default. Elimina el bug que generaba `import { Panel }` en
  `page.tsx` cuando el Panel solo exportaba como default (o viceversa).

### Fixed
- Rollback por `TS2614: Module ... has no exported member 'Card'/'Loader'`
  y `TS2304: Cannot find name 'Badge'` en runs donde el LLM ignoraba la
  allowlist del prompt. Ahora estos casos se auto-corrigen antes del
  quality gate final.

---

## [1.1.2] — 2026-04-22 — Repair dirigido de tipos + prompt backend con tabla de mapeo

### Added
- `contractRepair.replaceCsharpFieldType` — reemplaza in-place el tipo de un
  campo en un DTO C# (clase con cuerpo o record posicional), preservando el
  resto del handler generado por el LLM. Soportado en `repairStructuralIssues`
  para `B2B_TYPE_MISMATCH` con `lang: "C#"`.
- `backendArchitecturePrompt`: sección **MAPEO OBLIGATORIO DE TIPOS (Contrato
  JSON → C#)** con tabla explícita (`iso-date → DateTimeOffset`,
  `uuid → Guid`, `long → long`, `decimal → decimal`, etc.) y regla de
  nullability. Corta la tendencia del LLM a usar `string` para fechas.
- Smoke test 5b: verifica que tras `repairStructuralIssues` el DTO C# ya no
  dispara `B2B_TYPE_MISMATCH` y no queda `string Timestamp` en el archivo.

### Changed
- Cuando el LLM acierta en la lógica del handler pero yerra en el tipo de un
  campo del DTO, el orquestador ya NO rebuildea todo el backend vía fallback
  determinista (lo que descartaba la lógica LLM). Ahora hace un patch
  quirúrgico del tipo y conserva todo lo demás.

---

## [1.1.1] — 2026-04-22 — Verdict honesto por capa

### Fixed
- `runVerdict.computeVerdict` usaba la procedencia del código (LLM vs
  fallback) como proxy de "real vs stub". Con v1.1 el fallback puede emitir
  handlers reales, así que ahora la señal autoritativa es `backendRealHandler`
  (inspeccionado sobre el `.cs` final). Ver `INC-20260422-01`.

### Changed
- Taxonomía de verdict más honesta:
  - `real` = backend real **y** frontend real (LLM ok sin JSON-viewer).
  - `partial` = solo una capa es real (backend real + frontend placeholder
    o viceversa, o backend descartado).
  - `stub` = ambas capas son placeholder.
  - `failed` = rollback o quality gates finales fallidos.
- El mensaje "Problemas estructurales residuales" ahora dice "LLM produjo
  DTOs incompatibles con el contrato. Corrigiendo vía fallback determinista"
  para reflejar que es un paso de auto-corrección, no un error pendiente.
- `buildVerdictReport` imprime origen del handler real: "generación LLM" vs
  "fallback determinista con contexto del módulo".

### Added
- `__smokeTest.ts`: 4 escenarios nuevos de `computeVerdict`:
  ambas placeholder, ambas reales, fallback-con-contexto-real,
  back-real+front-stub, front-real+back-stub.

---

## [1.1.0] — 2026-04-21 — Plan v1.1 (Veredicto honesto + Real handler bootstrap)

Gran iteración. Tras los runs 04–06 (verdes en CI pero **semánticamente vacíos**:
handler era stub, DTO con campos inventados, ruta del feature nunca se wireaba),
se identificó que "verde" ≠ "útil". Esta versión ataca la raíz:

### Added
- **B) Veredicto honesto del run** (`runVerdict.ts`):
  - Tipos `RunVerdict` (`real` | `stub` | `partial` | `failed`) + `RunSignals`
    tracking granular (LLM calls, fallbacks, repairs, discards, rolled-back).
  - `handlerInspector.ts` analiza el C# generado y distingue handler real
    (DI + await + repo) de stub determinista (fingerprint explícito).
  - `printVerdictReport` reemplaza el mensaje optimista "desplegado
    exitosamente" por un reporte honesto; se persiste en `ai/logs/verdicts.jsonl`.
- **A) Contract-from-Entity** (`generate-contract <Entity>`):
  - `csEntityParser.ts` parsea `.cs` y resuelve propiedades heredadas de
    `DomainModel` / `AuditableModel`.
  - `contractFromEntity.ts` mapea C# → JSON Schema (`long`, `int`, `Guid`,
    `DateTimeOffset`, `decimal`, `bool`, enums), calcula `entityHash`
    (SHA1 de propiedades) y pluraliza endpoints (`y→ies`, `s/x/ch/sh/z→es`).
  - CLI: `npm run ai generate-contract GroupAvailability --module=Schedules
    --op=list`. Con `--dry-run` hace preview; con `--force` sobrescribe.
  - **Objetivo:** eliminar el desalineamiento contrato ↔ entidad que obligaba
    al repair a inventar campos (`id` / `status` / `timestamp` en runs anteriores).
- **E) Rule-based handler bootstrap** (`moduleIntrospector.ts` + `realHandlerBuilder.ts`):
  - Introspecta el módulo (`IGenericRepository<T, TKey>`, `IUnitOfWork*`).
  - Si hay repo/UoW disponible, `buildDeterministicBackend(ctx)` genera
    **handlers reales** que inyectan el UoW, invocan `GetAllAsync` /
    `GetByIdAsync` / `CreateAsync` / `Update` / `Delete` según HTTP verb,
    mapean entity → DTO campo a campo, y llaman `SaveChangesAsync`.
  - Para `list`, la Query/Handler/Endpoint quedan tipados como
    `Result<List<TResponse>>` automáticamente.
  - Sin contexto de proyecto, degrada al stub tradicional (backward compat).
- **C) Wire-in automático** (`frontendWireIn.ts`):
  - Tras generar el frontend, inyecta `UI/nitro-groups/src/app/<feature>/page.tsx`
    que importa y renderiza el `<Feature>Panel`. Elimina el paso manual de
    "cómo llego al componente".
- **D) Sandbox + GC** (`pipeline/sandbox.ts`):
  - Cada run snapshotea los archivos generados a
    `ai/.sandbox/<ts>-<feature>/` junto a `manifest.json`.
  - Al final, `stampSandboxVerdict` guarda el verdict en el manifest
    (evidencia post-mortem independiente del rollback transaccional).
  - `gcOldSandboxes` corre al inicio de cada run y borra sandboxes más
    viejos que `ORCH_SANDBOX_RETENTION_DAYS` (default 7).
  - Nuevo CLI: `npm run ai clean-feature <feature> [--dry-run] [--force]`
    elimina UseCases + Endpoints + features/<f> + app/<f>/page.tsx + contrato.

### Changed
- `generateFeature.ts` instrumentado end-to-end con `RunSignals`:
  `backendLlmCalled`, `backendLlmSucceeded`, `backendDeterministicFallback`,
  `backendDirectedRepair`, `autoRepairRounds`, `backendDiscarded`,
  `qualityGatesFinalOk`, `rolledBack`, `backendRealHandler`.
- `.gitignore`: ignoramos `ai/.sandbox/` y `ai/logs/`.
- `__smokeTest.ts` extendido con 3 bloques nuevos:
  verdict matrix (real/stub/partial/failed), contract-from-entity sobre
  `GroupAvailability`, wire-in, y sandbox snapshot + GC.

### Known limitations
- El introspector puede elegir un módulo "phantom" si existen proyectos Core
  legacy con el mismo nombre que la feature. Mitigación: usar
  `generate-contract --module=<Module>` para forzar, y `clean-feature` para
  limpiar phantoms. La v1.2 deprecará estos directorios de forma automática.

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
