# Plan V1.2 — deuda técnica estructural del orquestador

Este documento captura los 3 items del backlog v1.1 cuya ejecución NO cabe en
una sola sesión, y define cómo abordarlos de forma segura. Son cambios
estructurales: tocan muchos módulos y cualquier ejecución apurada arrastra
regresiones silenciosas. Están aquí esperando su propio ciclo.

---

## 1. Reemplazar parsing por regex con AST real (backend + frontend)

### Problema

Hoy `contractFromEntity`, `contractRepair`, `backendFallback`, `realHandlerBuilder`
y `frontendNormalizer` parsean C# y TypeScript con regex. Funciona para los
patrones del repo actual, pero se rompe cuando aparece:

- Un atributo multilínea (`[Required]\npublic ...`).
- Un generic con comas (`IReadOnlyList<Tuple<A,B>>`).
- Un record primary constructor con `with` expressions.
- Un TSX multilínea con props destructuradas.

La cobertura es imposible con regex; cualquier parche es paliativo.

### Solución propuesta

#### Frontend — `ts-morph`

- Dependencia: `ts-morph` (wrapper oficial sobre el TS Compiler API).
- Módulo nuevo: `ai/orchestrator/ast/typescriptAst.ts`
  - `parseSourceFile(code): SourceFile`
  - `getExports(sf): { name, kind, isDefault }[]`
  - `getImports(sf): { from, default?, named[] }[]`
  - `renameImport(sf, from, newShape): void`
  - `ensureDefaultExport(sf, name): void`
  - `getJsxTagUsage(sf, tagName): Node[]`

- `frontendNormalizer` se reescribe como serie de transformaciones sobre el
  `SourceFile`, no sobre texto. Los tests existentes siguen siendo válidos
  porque solo verifican el output textual.

- `uiComponentIntrospector` se reescribe para leer exports reales via AST
  en vez de regex. Elimina casos borde con interfaces/types exportados.

#### Backend — Roslyn CLI

Opción recomendada: **Roslyn via dotnet tool**. El parser oficial de C#
vive en `Microsoft.CodeAnalysis.CSharp`. Para no introducir una dependencia
Node→NuGet compleja:

- Crear un pequeño `dotnet tool` local en `ai/.tools/nitrogroups-ast`:
  - Acepta `--file path.cs` o `--stdin`.
  - Emite JSON con la estructura: clases, records, properties (name/type/
    nullable/attributes), usings, namespace.
- Desde Node invocamos `dotnet run --project ai/.tools/nitrogroups-ast -- --stdin`
  y parseamos el JSON.

- Módulo nuevo: `ai/orchestrator/ast/csharpAst.ts`
  - `parseCsFile(content): CsFileAst`
  - Consumidores: `contractFromEntity`, `contractRepair`, `realHandlerBuilder`.

Alternativa rápida: mantener regex como fallback, usar AST solo cuando
Roslyn CLI esté instalada. Permite introducción gradual.

### Plan de ejecución

1. **Sesión 1 (1d)**: integrar `ts-morph`, portar `uiComponentIntrospector`,
   validar con el smoke test.
2. **Sesión 2 (1d)**: portar `frontendNormalizer` a ts-morph. Correr
   suite + 5 runs reales para validar que no hay regresión.
3. **Sesión 3 (0.5d)**: scaffold del `nitrogroups-ast` dotnet tool con
   output JSON estable.
4. **Sesión 4 (1d)**: portar `contractFromEntity` a usar el JSON. Mantener
   regex como fallback si el tool falla.
5. **Sesión 5 (1d)**: portar `contractRepair` y `realHandlerBuilder`.

**Total estimado: 4.5 días** con QA por etapa.

---

## 2. Refactor de `generateFeature.ts` (~1300 líneas)

### Problema

El archivo concentra 15+ responsabilidades:
- Parsing de argumentos y modos.
- Anti-drafting protection.
- Resolución de módulo y context extractor.
- Impact analysis.
- Loop LLM con re-try y auto-correction.
- Normalizer frontend.
- Validación B2B.
- Wire-in.
- Sandbox / reconciliación.
- Quality gates + rollback.
- Verdict + memoria.

Cualquier cambio pisa con riesgo de regresión. Tests unitarios son difíciles.

### Solución propuesta — split en fases

```
ai/tasks/generateFeature.ts               ← orquestador, queda en ~200 líneas.
ai/orchestrator/phases/
  ├─ phase0_draftingProtection.ts         ← detecta feature↔entity match
  ├─ phase1_contextResolution.ts          ← módulo + domain context + drift
  ├─ phase2_impactAnalysis.ts
  ├─ phase3_llmGeneration.ts              ← backend + frontend con cadena LLM
  ├─ phase4_deterministicFallbacks.ts     ← fallback backend/frontend
  ├─ phase5_b2bValidation.ts
  ├─ phase6_repairLoop.ts                 ← loop de auto-correction
  ├─ phase7_wireIn.ts
  ├─ phase8_sandboxSnapshot.ts
  ├─ phase9_reconcileAndWrite.ts          ← incluye rollback
  └─ phase10_verdict.ts                   ← memoria + verdict + result
```

Cada fase recibe un **PipelineContext** inmutable y devuelve uno nuevo:

```typescript
interface PipelineContext {
  feature: string;
  mode: OrchestratorMode;
  contract: B2BContract;
  moduleName: string | null;
  signals: RunSignals;
  generatedFiles: FileOutput[];
  baseline: QualityBaseline;
  // ... campos agregados por fases
}
```

### Plan de ejecución

1. ✅ **Sesión 1**: definir `PipelineContext` + interfaces de fase,
   extraer fases autocontenidas (drafting, impact, wire-in, verdict).
   - Archivos: `ai/orchestrator/phases/pipelineContext.ts`,
     `draftingPhase.ts`, `impactPhase.ts`, `wireInPhase.ts`,
     `verdictPhase.ts`.
   - `generateFeature.ts`: 1384 → 1263 líneas (−121).
   - Smoke test verde, tsc limpio.
2. ✅ **Sesión 2**: módulo + domain context, hash / drift / compatibilidad
   entidad, y **quality baseline** + `runQualityGates` (helpers compartidos).
   - Archivos: `phases/moduleContextPhase.ts`, `phases/entityHashPhase.ts`,
     `pipeline/qualityGatesCore.ts`.
   - `getRegisteredModulesFromProgram` ahora toma `projectRoot` (testeable
     y coherente con `extractDomainContextFromModule` por parámetro).
   - `generateFeature.ts`: 1263 → 1091 líneas (−172 respecto a post-sesión-1).
   - Smoke + tsc en verde.
3. ✅ **Sesión 3**: bloques inyectables al prompt (digest por capa +
   decisiones) e invocación LLM (backend+frontend) + `parseMultiFileOutput` +
   fallbacks cuando la respuesta está vacía o falla, incl. top-up
   determinista si falta `Core/` o `UI/`.
   - Archivos: `phases/promptContextPhase.ts`, `phases/llmGenerationPhase.ts`.
   - `getFrontendArchitecturePrompt` recibe `{ projectRoot }` para
     introspección de UI (coherente con el resto del orquestador).
   - `generateFeature.ts`: 1091 → 1032 líneas (−59).
4. ✅ **Sesión 4**: validación de salida generada (rutas/imports),
   `recoverInvalidOutput`, `sanitizeProtectedFiles`; coherencia B2B
   (`runStructuralB2BPhase`: `validateB2BStructural` + repair en bucle +
   fallback determinista); autocorrección (`runAutoRepairLoop` +
   `validateFilesWithRollback` + `rollbackWrittenFiles` exportado).
   - Archivos: `phases/generatedOutputPhase.ts`,
     `phases/structuralB2BPhase.ts`, `phases/autoRepairLoopPhase.ts`.
   - `generateFeature.ts`: ~1032 → 494 líneas (tras rearmar el task
     completo sobre fases; el monolito local de validación/repair se
     eliminó).
   - Smoke + tsc en verde.
5. ✅ **Sesión 5**: persistencia a disco — `runPersistToDiskPhase`
   (`phases/persistPhase.ts`): confirmación, `plan/execute` reconcile,
   escritura, QG final, rollback (archivos + reconcile), reporte de
   fallo. Snapshot + `stampSandbox` en abort siguen en el task (junto al
   dry-run); el verdict feliz sigue en `runVerdictPhase` tras `persist.ok`.
   - `generateFeature.ts`: 494 → 440 líneas (−54).

**Estado actual**: el pipeline monolito está **modularizado**; el task
`generateFeature.ts` orquesta fases (drafting, módulo, hash, impacto,
lecciones+LLM, validación, B2B, autorepair, wire-in, snapshot/dry-run,
persist, verdict). Fases grandes pendientes del PLAN: §1 (AST) y §3
(tests E2E con LLM mockeado), no más splits obligatorios del orquestador.

**Próximos pasos (fuera de este split)**: ver §1 (AST) y §3 (tests) del
mismo documento. Cada iteración de refactor terminó con
`npx ts-node --transpile-only ai/orchestrator/__smokeTest.ts` en verde
antes del commit.

---

## 3. Tests de integración con LLM mockeado

### Problema

Hoy solo tenemos `__smokeTest.ts` que prueba piezas sueltas. No hay test
end-to-end que valide:
- Flujo completo con LLM que respeta las reglas.
- Flujo completo con LLM que las viola (trigger de fallback).
- Flujo completo con LLM que excede quota (rate limit).

Los bugs de integración solo aparecen cuando un usuario corre `generate-feature`.

### Solución propuesta

#### Mock provider

Nuevo módulo: `ai/providers/__mocks__/mockProvider.ts`:

```typescript
interface MockProviderConfig {
  responses: {
    /** Match por el role del prompt ("Arquitecto .NET Senior", etc.) */
    role: string;
    /** Raw output que el mock devolverá */
    output: string;
    /** O bien: error que simulará (rate-limit, 500, timeout). */
    error?: "rate-limit" | "server-error" | "parse-empty";
  }[];
}
```

El mock implementa la interfaz `LlmProvider` y se enchufa a la `chain`
reemplazando la registry real cuando se corre en modo test.

#### Test harness

`ai/tests/integration/featureGeneration.test.ts`:

- Fixture A: LLM respeta reglas → verdict REAL, archivos en rutas esperadas.
- Fixture B: LLM emite Card con named imports + Badge "success" → verdict
  REAL pero normalizer aplicó 3+ patches.
- Fixture C: LLM emite `string` para `iso-date` → verdict PARTIAL,
  contractRepair aplicó surgery.
- Fixture D: Todos los providers rate-limited → verdict STUB, fallback
  determinista.
- Fixture E: Quality gate .NET falla 3 veces → rollback + verdict FAILED.

Runner: ejecutar con `ts-node` en un `tmp` dir, sin tocar el repo real.
Cada test tiene su propio sandbox.

### Plan de ejecución

1. **Sesión 1 (0.5d)**: mockProvider + infraestructura (tmp dir, cleanup).
2. **Sesión 2 (1d)**: fixtures A, B, C.
3. **Sesión 3 (0.5d)**: fixtures D, E + integración con `npm run ai:test`.

**Total estimado: 2 días**.

---

## Priorización sugerida

1. **#2 Refactor generateFeature.ts** primero. Sin esto, tocar AST o
   integración se vuelve costoso.
2. **#3 Tests de integración** después del refactor. Te dan la red para
   avanzar al AST sin miedo.
3. **#1 AST parsing** al final. Es el cambio más invasivo.

Total estimado combinado: **~10 días** de trabajo enfocado. Razonable
repartir en 2 sprints.
