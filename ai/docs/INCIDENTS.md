# Bitácora de incidentes del Orquestador

Registro cronológico de bugs reales, su causa raíz y la corrección aplicada.
Cada entrada es trazable a commits y archivos concretos.

**Formato ID:** `INC-YYYYMMDD-NN` (fecha + secuencia del día).

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
