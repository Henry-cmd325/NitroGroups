# Bitácora de incidentes del Orquestador

Registro cronológico de bugs reales, su causa raíz y la corrección aplicada.
Cada entrada es trazable a commits y archivos concretos.

**Formato ID:** `INC-YYYYMMDD-NN` (fecha + secuencia del día).

---

## INC-20260423-01 — Memoria del orquestador: playbook de stack + hints Npgsql

**Fecha:** 2026-04-23  
**Severidad:** bajo (mejora generación; no bug de runtime del orquestador)

**Contexto:** Errores de producción (Npgsql solo acepta `DateTimeOffset` UTC en `timestamptz`, rutas front ≠ contrato, JWT audience) no estaban garantizados en el prompt si `ai/memory/errors.json` estaba vacío.

**Fix:**
- Nuevo `ai/memory/stackPlaybook.ts`: bloques estáticos **siempre** anexados al prompt backend/frontend en `promptContextPhase.ts` (complementa `errorDigest`).
- `errorDigest.ts`: hints heurísticos adicionales para mensajes que contengan `only offset 0 (UTC)` / `Cannot write DateTimeOffset` / `DbUpdateException` + DateTimeOffset.
- `backendArchitecturePrompt.ts`: una línea explícita sobre UTC al persistir fechas.

**Lecciones:** La memoria efectiva = digest de `errors.json` + reglas fijadas del repo en playbook. Sin playbook, el LLM repite errores que aún no se han registrado como entradas de digest.

---

## INC-20260422-04 — Archivos huérfanos del LLM quedaban en el árbol

**Fecha:** 2026-04-22
**Severidad:** medio (riesgo silencioso de basura en el repo)
**Fase afectada:** escritura final

**Síntoma:**
Cuando el LLM generaba archivos en rutas divergentes (p.ej. `UseCases/GroupAvailability/List/ListHandler.cs`)
y el fallback determinista producía el set correcto (`UseCases/GroupAvailability/Get/GetHandler.cs`),
el pipeline escribía el set correcto pero no borraba los del LLM. Resultado: dos handlers
para la misma feature conviviendo en el repo, uno de ellos compilando y otro no.

**Causa raíz:**
No había fase de reconciliación. El set "autoritativo" se escribía con `writeFileSync`
pero ningún paso eliminaba archivos preexistentes dentro del scope de la feature que no
estuvieran en el set.

**Fix:**
- Nuevo módulo `ai/orchestrator/pipeline/fileReconciler.ts`:
  - `planReconciliation()` escanea scopes de la feature
    (`Core/<Module>/**.Application/UseCases/<Feature>/`, etc.) y detecta archivos
    `.cs`/`.ts`/`.tsx` que no están en el set final.
  - `executeReconciliation()` los borra guardando backup.
  - `rollbackReconciliation()` los restaura si el quality gate final falla.
- Integrado en `generateFeature.ts` justo antes del bucle de escritura, con el mismo
  `try/catch` que el rollback de archivos sobrescritos.

**Archivos afectados:**
- `ai/orchestrator/pipeline/fileReconciler.ts` (nuevo)
- `ai/tasks/generateFeature.ts` (integración + rollback)

**Lecciones:**
- Cualquier pipeline que mezcla dos generadores necesita una fase de reconciliación.
- El rollback debe cubrir tanto archivos sobrescritos como eliminados.

---

## INC-20260422-05 — UI_ALIASES desactualizadas cuando se añadía un componente UI

**Fecha:** 2026-04-22
**Severidad:** bajo-medio (gastos de tokens adicionales por patches repetitivos)
**Fase afectada:** normalizer frontend + prompt frontend

**Síntoma:**
El `frontendNormalizer.ts` tenía una lista hardcoded de componentes UI con sus
exports default/named. Si alguien agregaba `TabbedSection.tsx` o `ProgressSteps.tsx`
al proyecto, el normalizer no lo conocía; el LLM adivinaba la forma del export
(normalmente mal) y el quality gate fallaba.

**Causa raíz:**
Lista estática dentro del módulo, desincronizada con el disco.

**Fix:**
- Nuevo `ai/orchestrator/generation/uiComponentIntrospector.ts` que lee
  `UI/nitro-groups/src/components/ui/*.tsx` en runtime, detecta default/named
  exports y variants CVA con balanceo real de llaves.
- `frontendNormalizer.ts` consume esta introspección.
- `ai/prompts/shared/uiAllowlist.ts` genera el bloque de aliases del prompt
  desde la misma fuente, para que LLM y normalizer vean la misma lista.
- Añadir un componente nuevo a UI/ se propaga automáticamente a ambos.

**Archivos afectados:**
- `ai/orchestrator/generation/uiComponentIntrospector.ts` (nuevo)
- `ai/orchestrator/generation/frontendNormalizer.ts` (reescrito)
- `ai/prompts/shared/uiAllowlist.ts` (nuevo)
- `ai/prompts/frontendArchitecturePrompt.ts` (consume allowlist dinámica)

**Lecciones:**
- Cualquier lista que espeje el disco debe introspectarse, no duplicarse.
- Un único punto de verdad evita el drift entre prompt-time y validate-time.

---

## INC-20260420-01 — Frontend generado no compilaba (react-query vs @tanstack/react-query)

**Fecha:** 2026-04-20
**Severidad:** alto
**Fase afectada:** generación frontend + quality gates

**Síntoma:**
El primer run de `generate-feature availability` produjo un frontend que
importaba `react-query` (API v3), pero el proyecto usa `@tanstack/react-query`
(v4+). Resultado: `TS2307: Cannot find module 'react-query'`.

**Causa raíz:**
El prompt frontend (`ai/prompts/frontendArchitecturePrompt.ts`) no explicitaba
la versión del paquete ni daba ejemplos. El LLM defaulteó al nombre histórico.

**Fix aplicado:**
- `ai/prompts/frontendArchitecturePrompt.ts`: imports obligatorios explícitos
  (`@tanstack/react-query`, `@/services/auth.service`, etc.).
- Checks en `generateFeature.ts` para validar existencia del módulo backend
  y su registro antes de generar.

**Verificación:**
El siguiente run compiló sin este error específico.

---

## INC-20260420-02 — Contrato declaraba endpoints no implementados

**Fecha:** 2026-04-20
**Severidad:** medio
**Fase afectada:** validación B2B

**Síntoma:**
`availability.contract.json` declaraba `allowedEndpoints: ["get", "update"]`
pero solo definía un método `getAvailability`. El validador marcaba incoherencia.

**Causa raíz:**
El contrato estaba mal escrito a mano; no había validación previa de
consistencia interna del contrato.

**Fix aplicado:**
- Corregido el contrato a `["get"]`.
- TODO: añadir validación de `allowedEndpoints ⊆ methods.http` en pre-flight.

**Verificación:**
Validación B2B pasa con contrato corregido.

---

## INC-20260420-03 — Context extractor no resolvía módulo correcto

**Fecha:** 2026-04-20
**Severidad:** alto
**Fase afectada:** carga de contexto

**Síntoma:**
Para feature `availability`, `resolveDomainContext` no encontraba el módulo
backend `Schedules` correctamente (devolvía vacío o matches erróneos).

**Causa raíz:**
Lógica de scoring débil en `ai/utils/contextExtractor.ts` — buscaba match exacto
del nombre de feature sin considerar sinónimos ni subaggregates.

**Fix aplicado:**
Refinada la función `resolveDomainContext` con:
- Búsqueda case-insensitive en nombres de módulo.
- Scoring por frecuencia de keyword del contrato en archivos del módulo.
- Fallback a inspección del archivo de entidad (`{Feature}.cs`).

**Verificación:**
Runs posteriores muestran `Módulo backend resuelto: Schedules` correctamente.

---

## INC-20260420-04 — Quality Gate confundía errores existentes con nuevos

**Fecha:** 2026-04-20
**Severidad:** alto
**Fase afectada:** quality gates

**Síntoma:**
El run fallaba reportando decenas de errores TS/.NET que YA existían en el
repo antes de la generación (herencia del monorepo).

**Causa raíz:**
`runQualityGates` ejecutaba `tsc` / `dotnet build` y trataba **toda** salida
de errores como nueva, sin diff contra estado previo.

**Fix aplicado:**
- `collectQualityBaseline()`: snapshot pre-generación (set de errores existentes).
- `getNewDiagnostics()`: diff contra baseline → solo errores nuevos.
- `generateFeature.ts`: se pasa baseline al auto-repair loop.

**Verificación:**
Los reports ahora muestran solo errores introducidos por la generación.

---

## INC-20260420-05 — Engram memory no disponible

**Fecha:** 2026-04-20
**Severidad:** medio
**Fase afectada:** persistencia de memoria

**Síntoma:**
`🧠 Engram no disponible — usando fallback local.` El sistema perdía contexto
entre runs.

**Causa raíz:**
Engram no estaba instalado. El cliente (`ai/memory/engramClient.ts`) fallaba
silenciosamente al HTTP.

**Fix aplicado:**
- Instalado `Gentleman-Programming/engram` binario Go, servidor local.
- `ai/memory/engramClient.ts`: prioriza CLI directo, con fallback a HTTP
  y luego a archivo local.
- Variables `ENGRAM_URL` y `ENGRAM_BIN` en `ai/.env`.

**Verificación:**
Run posterior muestra `🧠 Engram conectado — Memoria persistente activa.`

---

## INC-20260421-01 — Rate-limits largos de Groq bloqueaban el run (~30 min)

**Fecha:** 2026-04-21
**Severidad:** crítico
**Fase afectada:** generación LLM

**Síntoma:**
```
⚠️ Rate-limit detectado. Reintentando en 1800.0s...
```
Con una única key free de Groq, el orquestador esperaba 30 minutos o más
en un solo intento, haciendo el flujo inusable.

**Causa raíz:**
`ai/client.ts` tenía un cliente único OpenAI con política de backoff que
respetaba ciegamente el `retry-after` del header 429, sin opción de skip.

**Fix aplicado:**
Refactor completo a **cadena multi-proveedor**:
- Nuevo `ai/providers/` con adaptadores para Groq, Cerebras, Gemini, Ollama.
- `ai/providers/registry.ts` construye la cadena desde `AI_PROVIDER_ORDER`.
- `ai/client.ts` itera proveedores → modelos → intentos.
- Política: rate-limit corto → espera; rate-limit largo → siguiente.

**Verificación:**
`npm run ai providers` lista la cadena. Runs no quedan bloqueados.

---

## INC-20260421-02 — Ollama 7B crasheaba en hardware de 6GB VRAM

**Fecha:** 2026-04-21
**Severidad:** alto
**Fase afectada:** generación LLM (fallback local)

**Síntoma:**
```
llama runner process has terminated: exit status 0xc0000409
```
al intentar inferencia con `qwen2.5-coder:7b-instruct` en RTX 4050 6GB + 8GB RAM.

**Causa raíz:**
El modelo 7B cuantizado pesa ~4.7GB, consumiendo casi toda la VRAM; el KV
cache iba a RAM del sistema, saturando los 8GB.

**Fix aplicado:**
`ai/.env`: `OLLAMA_MODELS=qwen2.5-coder:3b-instruct` por default (~2GB).
El 7B queda como opción manual para hardware mayor.

**Verificación:**
Inferencia local estable con 3B; VRAM bajo 4GB.

---

## INC-20260421-03 — B2B_FIELD_MISSING persistía por patch files sintéticos

**Fecha:** 2026-04-21
**Severidad:** alto
**Fase afectada:** validación B2B + repair

**Síntoma:**
Aunque el repair loop generaba archivos `B2BContractPatch_status.cs`, el
validador seguía reportando `Campo 'status' no encontrado en código C#`.

**Causa raíz:**
El validador (v0) hacía string match en todos los archivos; los patch files
añadían el símbolo pero no modificaban el DTO real, así que la compilación
fallaba aparte. Los patch files eran ruido en el repo.

**Fix aplicado:**
- Eliminado el hack de patch files.
- Nuevo `ai/orchestrator/contract/structuralValidator.ts`: AST-light por DTO.
- Nuevo `ai/orchestrator/contract/contractRepair.ts`: `repairStructuralIssues`
  inyecta el campo **dentro del DTO real** (C# record posicional o class block,
  TS interface).
- `generateFeature.ts`: `validateB2BCoherence` reemplazado por `validateB2BStructural`.

**Verificación:**
Smoke test `__smokeTest.ts` sección "Repair dirigido": 4/4 assertions pasan.

---

## INC-20260421-04 — Test real: cadena LLM no saltaba entre proveedores

**Fecha:** 2026-04-21
**Severidad:** alto
**Fase afectada:** generación LLM (cadena multi-proveedor)

**Síntoma:**
En el primer run real con la cadena activa:
```
🔗 Cadena LLM activa: groq[5] → cerebras[2] → gemini[3] → ollama[1]
🧠 [groq] modelo 'llama-3.3-70b-versatile' (intento 1/2)...
⚠️  [groq:llama-3.3-70b-versatile] rate-limit de 1005.0s. Saltando...
🧠 [groq] modelo 'qwen/qwen3-32b' (intento 1/2)...
```
Con Groq rate-limitado 17 min, la cadena saltó a `qwen3-32b` (mismo Groq,
modelo más débil) en lugar de a **Cerebras** (que también tiene llama-3.3-70b
sin saturar). El modelo débil generó backend con mediator mal implementado.

**Causa raíz:**
En `ai/client.ts`, el `break` en rate-limit largo salía del loop de
intentos, pero el siguiente iter del `for (model of provider.models)` seguía
probando otro modelo del **mismo proveedor**. Nunca saltaba al siguiente
proveedor en el outer loop.

**Fix aplicado:**
`ai/client.ts`: agregado labels `providerLoop:` y `modelLoop:`, con
`continue providerLoop` cuando el rate-limit excede `LLM_LONG_RATE_LIMIT_MS`
(default 60s, configurable vía env).

**Verificación:**
Lógica validada en smoke test + revisión estática. Próximo run real
confirmará el salto a Cerebras cuando Groq rate-limitee.

---

## RUN-20260421-06 — Segunda corrida verde (✅ patrón confirmado)

**Fecha:** 2026-04-21
**Resultado:** Éxito total. Comportamiento production-ready **replicable**.

**Telemetría comparada con RUN-20260421-04:**
```
Cadena LLM:               groq → cerebras (salto por rate-limit 717s/1024s)
Llamadas LLM totales:     2 (1 backend + 1 frontend)
Rondas autocorrección:    0
Recuperaciones determ.:   2
  · Frontend: 'date-fns' alucinado → applyDeterministicFrontendFallback
  · Backend: 3 campos faltantes en DTO → repairStructuralIssues in-place
Quality Gates finales:    ✔️ al primer intento
Archivos desplegados:     9 (5 backend + 4 frontend)
```

**Lo que valida este run:**
1. ✅ Los fixes de INC-20260421-10 (allowlist backend) funcionaron preventivamente:
   el LLM NO volvió a inventar `EntityFrameworkCore` ni `SchedulesDbContext`
   (efecto del prompt endurecido + plantilla obligatoria).
2. ✅ Los bugs residuales del LLM (imports alucinados, campos omitidos) son
   ahora absorbidos **sin rondas LLM extra**.
3. ✅ El comportamiento verde es **replicable**, no un golpe de suerte.

**Patrón estable identificado:**
- 2 llamadas LLM por feature (1 backend + 1 frontend).
- ~5-15 s por llamada (Cerebras qwen-3-235b).
- 0 rondas de autocorrección en el caso típico.
- El pipeline determinista cubre los bugs más frecuentes del LLM.

**Tendencia acumulada (6 tests):**
| Run | LLM | Auto-correct | Resultado |
|-----|-----|--------------|-----------|
| 1 | 2+3 | agotadas | ⚠️ Frontend-only |
| 3 | 2+3 | agotadas | ⚠️ Deploy con desperdicio |
| 5 | 2+3 | agotadas | ⚠️ Deploy con desperdicio |
| 4 | 2   | 0          | ✅ Verde |
| 6 | 2   | 0          | ✅ Verde (confirmación) |

El orquestador cruzó el umbral de "production-ready" entre runs 3→4 con
los fixes de v1.0.1 a v1.0.3, y se confirmó en runs 5→6 con v1.0.5.

---

## INC-20260421-10 — LLM alucinaba DbContext + EF en capa Application

**Fecha:** 2026-04-21
**Severidad:** alto (desperdiciaba 3 rondas LLM de autocorrección)
**Fase afectada:** generación backend + quality gates

**Síntoma (del 5to test real):**
```
error CS0234: 'EntityFrameworkCore' no existe en 'Microsoft'
error CS0246: 'IQuery<>' no se encontró
error CS0246: 'Result<>' no se encontró
error CS0246: 'SchedulesDbContext' no se encontró
error CS0234: 'Common' no existe en 'NitroGroups.Core'
error CS0234: 'Infrastructure' no existe en 'NitroGroups.Core.Schedules' (desde Application)
```
Las 3 rondas de autocorrección LLM (gastando cadena Groq→Cerebras cada
vez) no pudieron arreglarlo porque el LLM **insistía** en inventar
`SchedulesDbContext` y meter EF Core en la capa Application, violando
referencias de proyecto.

**Causa raíz:**
- El prompt backend solo daba arquitectura de alto nivel sin una allowlist
  de `using` permitidos por capa.
- `NitroGroups.Core.Schedules.Application.csproj` NO referencia
  `NitroGroups.Core.Schedules.Infrastructure` (sería ciclo) ni
  `Microsoft.EntityFrameworkCore`. El LLM lo desconocía y asumía un
  patrón tipo "Clean Architecture con EF directo".
- El validador pre-flight no inspeccionaba `using` statements del C#
  generado, así que los imports alucinados llegaban hasta el `dotnet build`,
  desperdiciando ciclos.

**Fix aplicado:**

1. `ai/prompts/backendArchitecturePrompt.ts`:
   Sección nueva "ALLOWLIST DE NAMESPACES (ESTRICTO — NO INVENTES)"
   con using permitidos/prohibidos por capa (Application / Infrastructure
   / Domain) y prohibición explícita de `${Module}DbContext` y
   `NitroGroups.Core.Common`. Se añade plantilla obligatoria del Query
   Handler usando un `I{Aggregate}Repository` inyectado vía DI.

2. `ai/tasks/generateFeature.ts`:
   - Constantes `BACKEND_APP_ALLOWED_NAMESPACES`,
     `BACKEND_INFRA_ALLOWED_NAMESPACES`,
     `BACKEND_DOMAIN_ALLOWED_NAMESPACES`.
   - Función `backendAllowedForPath` (elige allowlist según capa del archivo).
   - Función `detectHallucinatedBackendImports` (parsea `using` vía regex
     y reporta los que no encajan).
   - `validateGeneratedOutput` llama al detector para cada archivo `.cs`
     y emite issues `kind: "backend"`, que disparan `recoverInvalidOutput`
     con `buildDeterministicBackend` ANTES de gastar tokens LLM.

**Verificación:**
Smoke test 15/15 sigue pasando (el backend determinista ya usaba imports
limpios). El siguiente run con errores similares debe verse recuperado
en pre-flight, no en quality gates.

---

## RUN-20260421-04 — Primera corrida production-ready (✅ verde)

**Fecha:** 2026-04-21
**Resultado:** Éxito completo sin autocorrección LLM.

**Telemetría:**
```
🔗 Cadena LLM activa: groq[5] → cerebras[2] → gemini[3] → ollama[1]
🧠 [groq] llama-3.3-70b-versatile → rate-limit 938s → salta proveedor.
🧠 [cerebras] qwen-3-235b-a22b-instruct-2507 → OK (backend).
🧠 [groq] llama-3.3-70b-versatile → rate-limit 1978s → salta proveedor.
🧠 [cerebras] qwen-3-235b-a22b-instruct-2507 → OK (frontend).

⚠️ Salida LLM fuera de reglas:
   · Import fuera de allowlist '@/lib/format'.
   [🛠️] Recuperación determinista aplicada sobre: frontend.

⚠️ Problemas estructurales residuales:
   - B2B_FIELD_MISSING: id / status / timestamp en AvailabilityResponse C#.
   [🛠️] Repair dirigido B2B → campos inyectados.

[🔁] Quality Gates: 0 errores nuevos al primer intento.
[🧪] Quality Gates finales: ✔️
🚀 9 archivos desplegados (5 backend + 4 frontend).
```

**Lo que validó este run:**
1. ✅ Política rate-limit largo → salto de proveedor (INC-20260421-04 cerrado).
2. ✅ Cerebras con catálogo depurado, sin 404 (INC-20260421-08 cerrado).
3. ✅ Detección de import alucinado `@/lib/format` (inventado por el LLM) antes de autocorrección (INC-20260421-09 cerrado).
4. ✅ Recuperación determinista frontend sin gastar tokens extra.
5. ✅ Repair B2B dirigido inyectó 3 campos faltantes en DTO C# real (sin patch files).
6. ✅ 0 intentos de autocorrección LLM consumidos (todo resuelto en pipeline determinista).
7. ✅ Quality Gates verdes al primer pass.

**Observación preventiva:**
El LLM (qwen-3-235b) omitió 3 campos del Response DTO. El repair los recuperó,
pero el prompt backend puede ser más explícito para evitar el trabajo. Fix aplicado
en `ai/prompts/backendArchitecturePrompt.ts` (ver CHANGELOG 1.0.4).

---

## INC-20260421-09 — LLM alucinaba paquetes/componentes inexistentes

**Fecha:** 2026-04-21
**Severidad:** alto
**Fase afectada:** generación frontend + quality gates

**Síntoma:**
El componente generado importaba librerías no instaladas y alias con casing
incorrecto:
```
Cannot find module 'date-fns'
Cannot find module 'react-icons/fa'
File name '...ui/button.tsx' differs from already included '...ui/Button.tsx' only in casing
Module '"@/components/ui/card"' has no exported member 'Card'
Cannot find module '@/components/ui/skeleton'
```
Tres rondas de autocorrección LLM no lograron arreglarlo (los modelos
insistían en patrones shadcn/ui que este proyecto no implementa).

**Causa raíz:**
El prompt frontend no daba allowlist explícita de imports permitidos,
así que el LLM asumía convenciones de proyectos populares (shadcn/ui,
date-fns, react-icons). El proyecto real usa un `Card` default-exported
con API `{ header, children, footer }` y `lucide-react` para iconos.

**Fix aplicado:**

1. `ai/prompts/frontendArchitecturePrompt.ts`: sección nueva
   "ALLOWLIST DE IMPORTS (ESTRICTO — NO INVENTES)" que lista:
   - Paquetes externos permitidos (según `package.json` real).
   - Aliases exactos con casing y tipo de export (default vs named).
   - Paquetes/aliases prohibidos con alternativa sugerida.
   - Patrones específicos anti-shadcn (CardHeader/CardTitle no existen).

2. `ai/tasks/generateFeature.ts`: nueva función
   `detectHallucinatedFrontendImports` y constantes
   `FRONTEND_IMPORT_ALLOWLIST` + `FRONTEND_ALIAS_ALLOWLIST_EXACT`.
   El validador las aplica a cada archivo frontend y marca el import
   como issue `kind: "frontend"` → dispara `recoverInvalidOutput`
   con fallback determinista antes de gastar tokens en autocorrección.

**Verificación:**
Smoke test 15/15 pasa. El fallback determinista frontend solo usa imports
de la allowlist (verificado por grep). Las autocorrecciones innecesarias
del siguiente run deben reducirse drásticamente.

---

## INC-20260421-08 — Cerebras `gpt-oss-120b` retornaba 404 para key libre

**Fecha:** 2026-04-21
**Severidad:** alto
**Fase afectada:** cadena LLM

**Síntoma:**
`⚠️ [cerebras:gpt-oss-120b] error no recuperable: 404 status code (no body)`
cada vez que la cadena activaba Cerebras.

**Causa raíz:**
`gpt-oss-120b` aparece en `GET /v1/models` de Cerebras pero el tier libre
de la key provista **no tiene acceso** al endpoint de inferencia del modelo.
Cerebras retorna 404 (en vez de 403) cuando la combinación key+modelo no
está habilitada. Validado empíricamente con un script
(`ai/__cerebrasTest.ts` — descartado tras confirmar):
- `gpt-oss-120b` → 404
- `qwen-3-235b-a22b-instruct-2507` → OK (840 ms)
- `llama3.1-8b` → OK (214 ms)

**Fix aplicado:**
`ai/.env`:
```
CEREBRAS_MODELS="qwen-3-235b-a22b-instruct-2507,llama3.1-8b"
```
Eliminado `gpt-oss-120b` del orden por esta key. Si el usuario activa un
tier mayor, puede re-añadirlo.

**Verificación:**
Test empírico con `curl`/OpenAI SDK confirma que los dos modelos restantes
responden correctamente.

---

## INC-20260421-07 — Validador abortaba ante salida LLM reparable

**Fecha:** 2026-04-21
**Severidad:** alto
**Fase afectada:** pre-validación de salida LLM

**Síntoma:**
```
💥 SALIDA GENERADA INVÁLIDA:
   ❌ El service ...availability.service.ts debe importar DTOs desde ../types/availability.types.
   ❌ El service ...availability.service.ts debe usar getApiAccessToken desde "@/services/auth.service".
```
Modelo débil (cerebras `llama3.1-8b`) generó service sin los imports
obligatorios. El orquestador **abortaba** en vez de aplicar el fallback
frontend determinista (que SÍ produce esos imports correctamente).

**Causa raíz:**
`validateGeneratedOutput` trataba todos los errores como fatales y retornaba
temprano. No había clasificación entre issues reparables
(imports, coherencia local) vs issues fatales (path traversal, overwrite
protegido, scope inválido).

**Fix aplicado:**
`ai/tasks/generateFeature.ts`:
- `validateGeneratedOutput` ahora retorna issues tipadas:
  `{ kind: "fatal" | "frontend" | "backend", message }`.
- Nueva función `recoverInvalidOutput` que, si todas las issues son
  reparables, reemplaza las secciones problemáticas por el fallback
  determinista correspondiente (`applyDeterministicFrontendFallback` o
  `buildDeterministicBackend`).
- Callsites pre-validación y post-repair usan `recoverInvalidOutput`
  antes de abortar.

**Verificación:**
Smoke test 15/15 sigue pasando. En un próximo run, una salida con imports
mal deberá verse recuperada en vez de abortar.

---

## INC-20260421-06 — Cerebras 404 por nombres de modelo obsoletos

**Fecha:** 2026-04-21
**Severidad:** alto
**Fase afectada:** cadena LLM

**Síntoma:**
```
🧠 [cerebras] modelo 'llama-3.3-70b' (intento 1/2)...
⚠️  [cerebras:llama-3.3-70b] error no recuperable: 404 status code (no body)
```
El failover llegaba a Cerebras pero todos los intentos con `llama-3.3-70b`
fallaban con 404.

**Causa raíz:**
El catálogo de Cerebras cambió. Sus modelos producción actuales son:
- `gpt-oss-120b` (producción, 120B params, ~3000 tok/s)
- `llama3.1-8b` (producción, 8B)
- `qwen-3-235b-a22b-instruct-2507` (preview, 235B)
- `zai-glm-4.7` (preview)

`llama-3.3-70b` ya no está disponible. Sin embargo estaba listado
(heredado de docs antiguas) en `CEREBRAS_MODELS` del `.env`.

**Fix aplicado:**
`ai/.env`:
```
CEREBRAS_MODELS="gpt-oss-120b,qwen-3-235b-a22b-instruct-2507,llama3.1-8b"
```
Orden: modelo más capaz primero (`gpt-oss-120b`), preview potente
(`qwen-3-235b`) en medio, 8B al final como último reintento del proveedor.

**Verificación:**
Próximo run debe mostrar intento exitoso con `gpt-oss-120b` en Cerebras
cuando Groq esté rate-limitado.

---

## INC-20260421-05 — Backend determinista no compilaba (namespaces cruzados)

**Fecha:** 2026-04-21
**Severidad:** crítico
**Fase afectada:** fallback determinista backend

**Síntoma:**
Tras descartar el backend generado por LLM, el fallback determinista
producía archivos que fallaban la compilación .NET:
```
error CS0246: 'AvailabilityResponse' no se encontró
  en GetAvailabilityQuery.cs
  en GetAvailabilityQueryHandler.cs
  en Get.cs (endpoint)
```

**Causa raíz:**
`buildDeterministicBackend` colocaba los DTOs en subcarpetas separadas:
```
UseCases/Availability/Requests/GetAvailabilityRequest.cs    (ns: ...Availability.Requests)
UseCases/Availability/Responses/AvailabilityResponse.cs     (ns: ...Availability.Responses)
UseCases/Availability/Get/GetAvailabilityQuery.cs           (ns: ...Availability.Get)
```
El Query/Handler/Endpoint nunca añadían `using` a los namespaces de los DTOs,
así que el compilador no los encontraba.

**Fix aplicado:**
`ai/orchestrator/generation/backendFallback.ts`:
- `buildDtoFile` ahora recibe `operation` (ej: `"Get"`) en vez de
  `subNamespace: "Requests" | "Responses"`.
- Los DTOs se colocan en el **mismo folder y namespace** que el Query/Handler:
  ```
  UseCases/Availability/Get/
    ├── GetAvailabilityRequest.cs    ← mismo ns que Query
    ├── AvailabilityResponse.cs      ← mismo ns que Query
    ├── GetAvailabilityQuery.cs
    └── GetAvailabilityQueryHandler.cs
  ```
- Cero `using` cruzados → compila garantizado.

`ai/orchestrator/__smokeTest.ts`: assertion agregada
`"DTOs no viven en subcarpetas /Requests|Responses"`.

**Verificación:**
Smoke test 15/15 assertions pasan. Backend determinista ahora es
compilable de primera.

---

## INC-20260421-11 — "Verde" != "util" (handler stub, DTO inventado, ruta ausente)

**Fecha:** 2026-04-21
**Severidad:** critico (arquitectonico)
**Fase afectada:** fallback backend + promocion de runs

**Sintoma:**
Tras dos runs consecutivos verdes (04 y 06), el equipo valida la feature
`availability` manualmente y descubre que:
1. El `GetAvailabilityQueryHandler` era un stub determinista con valores
   hardcodeados (`Id = 0; Status = "available"; Timestamp = 0`). No tocaba
   ningun `IGroupAvailabilityRepository`.
2. El contrato declaraba `status` y `timestamp`, campos que no existen en
   la entidad `GroupAvailability` (tiene `StartAt`, `EndAt`, `CustomPrice`,
   `Available`). El repair dirigido los inyecto como DTO vacio para no
   romper la validacion estructural.
3. El `AvailabilityPanel.tsx` quedo generado pero nunca fue referenciado:
   no existia `app/availability/page.tsx`, asi que la ruta `/availability`
   no resolvia.
4. El pipeline imprimia "desplegado exitosamente" en todos los casos,
   ocultando los puntos 1-3.

**Causa raiz:**
- El `buildDeterministicBackend` solo generaba stubs.
- No habia forma programatica de obtener un contrato fiel a la entidad;
  se escribia a mano y se desalineaba.
- El orquestador no sabia distinguir "LLM produjo codigo real" de
  "cayo al fallback determinista". El mensaje de exito era siempre el mismo.
- El wire-in del frontend era un paso implicito que nadie hacia.

**Fix aplicado (Plan v1.1 — cinco bloques B, A, E, C, D):**
1. **B — Veredicto honesto:** `ai/orchestrator/pipeline/runVerdict.ts` +
   `handlerInspector.ts` + instrumentacion en `generateFeature.ts`.
   Sustituye el mensaje final por `printVerdictReport` con
   `real` | `stub` | `partial` | `failed` y persiste en `ai/logs/verdicts.jsonl`.
2. **A — Contract-from-Entity:** `ai/orchestrator/contract/csEntityParser.ts`
   + `contractFromEntity.ts` + CLI `generate-contract`. Deriva el contrato
   del `.cs` real (con herencia `DomainModel` / `AuditableModel`), mapea
   tipos (`long`, `Guid`, `DateTimeOffset`, `decimal`) y calcula
   `entityHash`. Elimina el escenario "campo inventado".
3. **E — Real handler bootstrap:** `moduleIntrospector.ts` (descubre repos
   + UoW del modulo) + `realHandlerBuilder.ts` (genera handler que inyecta
   `IUnitOfWork<Module>`, llama `GetAllAsync` / `GetByIdAsync` / `CreateAsync`
   / `Update` / `Delete` + `SaveChangesAsync`, y mapea propiedad a propiedad).
   Cuando `buildDeterministicBackend` recibe `projectRoot`, ya no emite
   stubs: emite codigo funcional contra el repo real.
4. **C — Wire-in automatico:** `generation/frontendWireIn.ts` genera
   `UI/nitro-groups/src/app/<feature>/page.tsx` que importa y monta el
   `<Feature>Panel` al final de la fase de escritura.
5. **D — Sandbox + GC:** `pipeline/sandbox.ts` snapshotea cada run en
   `ai/.sandbox/<ts>-<feature>/` con `manifest.json`; el verdict queda
   estampado al finalizar (evidencia auditable independiente del rollback).
   `gcOldSandboxes` corre al inicio (retencion via
   `ORCH_SANDBOX_RETENTION_DAYS`). Nuevo CLI `clean-feature` para
   borrados intencionales (incluye deteccion de phantoms Core/<feat>).

**Verificacion:**
`__smokeTest.ts` extendido con cuatro bloques (verdict matrix, contract
derivation, wire-in, sandbox). Todas las aserciones pasan. La matriz de
verdicts distingue correctamente stub/real/partial/failed en casos
construidos. `generate-contract GroupAvailability --dry-run` produce un
contrato con tipos correctos (`id: number/long`, `startAt: string/iso-date`,
`customPrice: number/decimal`, `available: boolean`).

**Pendiente (v1.2):**
- El introspector puede elegir modulos phantom (`Core/Availability/`) si
  existen directorios legacy homonimos. Mientras tanto, el usuario debe
  llamar `clean-feature` + `generate-contract --module=<Real>`.
- Habilitar que `generateFeature` invoque `generate-contract` automaticamente
  si el `entityHash` del contrato esta vacio o desactualizado.

---

## INC-20260422-01 — Verdict reportaba STUB cuando el handler era REAL

**Fecha:** 2026-04-22
**Severidad:** medio
**Fase afectada:** reporting (`pipeline/runVerdict.ts`)

**Síntoma:**
Tras los fixes v1.1, `generate-feature groupAvailability` producía un handler
.cs con primary constructor + inyección de `IUnitOfWorkSchedules` + `await
unitOfWork.AvailabilityRepository.GetAllAsync()` — es decir, **código real**
que compilaba y respetaba la arquitectura. Sin embargo el verdict final
imprimía `🟡 STUB` con la leyenda "Backend: fallback determinista (handler
stub pendiente de lógica real)".

**Causa raíz:**
`computeVerdict` usaba como heurística de stub la _procedencia_ del backend
(`backendDeterministicFallback === true → stub`) en vez de la _realidad_ del
código (`backendRealHandler === true|false`). Con el bloque E de v1.1, el
fallback determinista dejó de ser sinónimo de "handler mock": cuando el
módulo expone UoW/repositorios introspectables, el fallback emite código
real. El verdict no se actualizó en consecuencia.

Además, la taxonomía `stub | real | partial | failed` no distinguía el caso
frecuente **backend real + frontend placeholder** (o viceversa): ambos caían
en `stub`, ocultando que una capa sí quedó operativa.

**Fix aplicado (`ai/orchestrator/pipeline/runVerdict.ts`):**
- `computeVerdict` ahora usa `backendRealHandler` como señal autoritativa
  del backend y `frontendLlmSucceeded && !frontendDeterministicFallback`
  como señal del frontend.
- Nueva semántica: **real** = ambas capas reales; **partial** = solo una
  capa real (resto stub/descartado); **stub** = ambas capas placeholder;
  **failed** = rollback o quality gates finales fallidos.
- `buildVerdictReport` imprime origen explícito del handler real
  ("generación LLM" vs "fallback determinista con contexto del módulo").
- `generateFeature.ts` cambia el texto "Problemas estructurales residuales"
  por "LLM produjo DTOs incompatibles con el contrato. Corrigiendo vía
  fallback determinista" para no sugerir bugs pendientes cuando el
  pipeline está auto-corrigiendo.

**Verificación:**
`ai/orchestrator/__smokeTest.ts` cubre los cuatro escenarios
(real/partial×2/stub) y el caso v1.1 "fallback con contexto → real".

---

## INC-20260422-02 — LLM usaba `string` para fechas ISO, disparaba fallback masivo

**Fecha:** 2026-04-22
**Severidad:** medio
**Fase afectada:** prompt backend + repair dirigido

**Síntoma:**
En runs donde el backend LLM respondía OK (Groq verde), el DTO salía con
`public string StartAt { get; set; }` aunque el contrato lo declaraba como
`type: "string", format: "iso-date"`. El validador estructural lo marcaba
`B2B_TYPE_MISMATCH` y el orquestador rebuildeaba **todo el backend** con el
fallback determinista, descartando el handler correcto que el LLM había
producido. Resultado: verdict degradado de `real` → `partial`/`stub` sin
razón técnica.

**Causa raíz:**
1. El prompt backend no documentaba el mapeo `format → C# type`. Mostraba
   `DateTimeOffset Timestamp` en un ejemplo pero no era una regla explícita.
2. `contractRepair.ts` tenía comentado:
   `// B2B_TYPE_MISMATCH: no se autorrepara automáticamente`. Cualquier
   mismatch escalaba al fallback global, perdiendo el resto del trabajo LLM.

**Fix aplicado:**
- `backendArchitecturePrompt.ts`: tabla explícita de mapeo
  (iso-date → DateTimeOffset, uuid → Guid, long → long, etc.) + regla de
  nullability. Esto previene el problema en origen cuando el LLM responde.
- `contractRepair.ts`: nueva función `replaceCsharpFieldType` que hace un
  patch quirúrgico sobre el DTO (clase o record posicional), y
  `repairStructuralIssues` ahora maneja `B2B_TYPE_MISMATCH` con `lang: "C#"`.
  Preserva handler, endpoints y demás lógica del LLM.
- Smoke test 5b cubre el escenario: `string Timestamp` → repair → `long Timestamp` → validación OK.

**Verificación:**
`npx ts-node --transpile-only ai/orchestrator/__smokeTest.ts` pasa
todas las aserciones (incluidas las nuevas de TYPE_MISMATCH repair).

---

## INC-20260422-03 — LLM frontend ignoraba allowlist (Card/Loader/Badge) → rollback

**Fecha:** 2026-04-22
**Severidad:** alto
**Fase afectada:** generación frontend + quality gates

**Síntoma:**
Run de `generate-feature groupAvailability` terminó con
`💥 NO SE PUDO AUTOCORREGIR LA GENERACIÓN.` Las 3 rondas de autocorrección
IA fallaron con variantes del mismo patrón:
- `TS2614: Module '"@/components/ui/Card"' has no exported member 'Card'`
- `TS2614: Module '"@/components/ui/Loader"' has no exported member 'Loader'`
- `TS2304: Cannot find name 'Badge'` (uso sin import)
- `TS2322: Type '"success"' is not assignable to variant` (Badge variants
  inventadas)
- `TS2613: Module ... has no default export` (el Panel alternaba
  default/named export entre rondas, dejando el `page.tsx` del wire-in
  fuera de sync).

**Causa raíz:**
1. El prompt frontend tenía la allowlist correcta, pero el LLM la ignoraba
   en ~50% de los runs. La autocorrección IA heredaba los mismos vicios.
2. El wire-in hacía detección runtime (default vs named) sobre el Panel en
   memoria, pero cada ronda de IA podía reescribirlo con el otro estilo,
   desincronizando el import del `page.tsx`.
3. No había ninguna capa determinista entre el LLM y la validación: cada
   "dumbness" del LLM se propagaba al quality gate.

**Fix aplicado:**
- `ai/orchestrator/generation/frontendNormalizer.ts` — nueva capa
  determinista que corrige los 5 patrones más frecuentes
  (imports invertidos, imports fantasma de `Card`, Badge variants,
  `<Badge>` sin import, Panel sin default export). Ver changelog `[1.1.3]`.
- `generateFeature.ts`: normalizer invocado (a) tras generación inicial y
  (b) tras cada ronda de autocorrección IA. Esto blinda contra el caso en
  que la IA "arregla" un error pero introduce otro.
- `frontendWireIn.ts`: siempre prefiere default import. Como el normalizer
  garantiza `export default <Feature>Panel`, la combinación es estable
  entre rondas.
- Smoke test 8b cubre los 8 aspectos del normalizer.

**Verificación:**
`ai/orchestrator/__smokeTest.ts` agrega 8 nuevas aserciones sobre
`normalizeFrontendOutput`. En runs reales, errores `TS2614`/`TS2304` de esta
naturaleza se corrigen antes de llegar al quality gate.

---

## Lecciones aprendidas

1. **String matching ≠ validación estructural.** La v0 del validador B2B era
   frágil; el AST-light (aun con regex) atrapa problemas reales.
2. **El fallback determinista debe compilar al primer intento.** Si el fallback
   también requiere correcciones, no es fallback; es más código frágil.
3. **Namespaces en .NET son trampa.** Preferir colocar código relacionado en
   el mismo namespace/folder salvo que haya razón arquitectónica explícita.
4. **Rate-limits son la norma, no la excepción** cuando se usan tiers gratuitos.
   La cadena multi-proveedor no es opcional para uso serio.
5. **Siempre comparar contra baseline.** Ejecutar `tsc`/`dotnet build` sin diff
   enmascara los errores reales en errores heredados.
6. **Rollback transaccional salva el repo.** Las "pequeñas pruebas" nunca son
   pequeñas cuando fallan en el medio.
