# Arquitectura del Orquestador — v1.0

## Objetivo

Generar features full-stack (backend .NET + frontend React) a partir de un
**contrato B2B** en JSON, garantizando:

- **Coherencia** entre contrato, backend y frontend.
- **Compilabilidad** del código generado (TypeScript + .NET).
- **Resiliencia** ante fallos de LLM (rate-limits, generaciones inválidas).
- **Ahorro de tokens** mediante generación determinista cuando aplica.
- **Rollback transaccional**: si algo falla críticamente, no se corrompe el repo.

## Modos de ejecución

Controlados por `--mode` y definidos en `ai/orchestrator/pipeline/modes.ts`:

| Modo | Qué genera | Qué valida |
|------|------------|------------|
| `full-stack` (default) | Backend + Frontend | Ambos + B2B cruzado |
| `frontend-only` | Solo Frontend | Solo frontend + contrato |
| `contract-only` | Nada (dry-run) | Solo compatibilidad contrato ↔ entidad |

## Layout de directorios

```
ai/
├── client.ts                       # Entry LLM con failover multi-proveedor
├── index.ts                        # CLI (generate-feature, providers)
├── .env                            # API keys y orden de proveedores
├── contracts/b2b/                  # Contratos B2B fuente de verdad
├── memory/                         # Engram client (memoria persistente)
├── providers/                      # Adaptadores LLM
│   ├── types.ts                    # LLMProvider interface + RateLimitError
│   ├── openAICompatibleBase.ts     # Base OpenAI-compatible
│   ├── groqProvider.ts
│   ├── cerebrasProvider.ts
│   ├── geminiProvider.ts
│   ├── ollamaProvider.ts
│   └── registry.ts                 # Construcción y orden de la cadena
├── orchestrator/
│   ├── types.ts                    # FileOutput, B2BContract, etc.
│   ├── __smokeTest.ts              # Test end-to-end sin LLM
│   ├── contract/
│   │   ├── structuralValidator.ts  # Validación AST-light B2B
│   │   └── contractRepair.ts       # Inyección in-place de campos faltantes
│   ├── generation/
│   │   ├── backendFallback.ts      # Backend .NET determinista
│   │   ├── frontendFallback.ts     # Frontend React determinista
│   │   └── parser.ts               # Parseo multi-file del output LLM
│   └── pipeline/
│       └── modes.ts                # Modos orquestador
├── prompts/                        # Prompts del sistema
├── tasks/
│   └── generateFeature.ts          # Orquestador principal (entry lógico)
├── utils/                          # Context extractor, file ops, etc.
└── docs/                           # ← esta documentación
```

## Flujo end-to-end (modo `full-stack`)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. CARGA CONTEXTO                                                    │
│    ├─ Lee contrato B2B JSON                                          │
│    ├─ Conecta a Engram (memoria)                                     │
│    └─ Resuelve módulo backend (resolveDomainContext)                 │
├──────────────────────────────────────────────────────────────────────┤
│ 2. VALIDACIÓN PRE-GENERACIÓN                                         │
│    ├─ Contrato ↔ Entidad compatibles?                                │
│    └─ Impact analysis (riesgo + archivos afectados)                  │
│       Si riesgo ALTO → pide confirmación al usuario                  │
├──────────────────────────────────────────────────────────────────────┤
│ 3. BASELINE DE ERRORES                                               │
│    ├─ npx tsc (snapshot errores existentes)                          │
│    └─ dotnet build (snapshot errores existentes)                     │
│    → se usarán para calcular SOLO errores nuevos                     │
├──────────────────────────────────────────────────────────────────────┤
│ 4. GENERACIÓN LLM                                                    │
│    ├─ Backend: cadena LLM → parser multi-file                        │
│    └─ Frontend: cadena LLM → parser multi-file                       │
├──────────────────────────────────────────────────────────────────────┤
│ 5. VALIDACIÓN B2B ESTRUCTURAL                                        │
│    (sin string match; AST-light por archivo/DTO)                     │
│    Si faltan campos → REPAIR DIRIGIDO (inyecta in-place)             │
├──────────────────────────────────────────────────────────────────────┤
│ 6. QUALITY GATES CON AUTOCORRECCIÓN (loop hasta 3 intentos)          │
│    En cada intento:                                                  │
│    ├─ Escribe archivos a disco (transaccional)                       │
│    ├─ Corre tsc + eslint + dotnet build                              │
│    ├─ Compara con baseline → extrae SOLO errores nuevos              │
│    │                                                                 │
│    Si hay errores nuevos:                                            │
│    ├─ ROLLBACK (restaura archivos a estado previo)                   │
│    ├─ Pide al LLM un patch dirigido con los errores                  │
│    └─ Si LLM falla → FALLBACK DETERMINISTA:                          │
│         ├─ frontend → applyDeterministicFrontendFallback             │
│         ├─ backend → buildDeterministicBackend                       │
│         └─ último recurso → degrada a frontend-only                  │
├──────────────────────────────────────────────────────────────────────┤
│ 7. DEPLOY FINAL                                                      │
│    ├─ Confirmación al usuario                                        │
│    ├─ Escritura atómica                                              │
│    └─ Quality Gates finales (verificación post-escritura)            │
└──────────────────────────────────────────────────────────────────────┘
```

## Mecanismos de ahorro de tokens

Ordenados de mayor a menor impacto:

1. **Generación determinista** (backend + frontend): cero tokens para el
   esqueleto compilable. El LLM solo se usa cuando se necesita lógica real.
2. **Repair dirigido in-place**: en vez de regenerar un archivo completo,
   se inyecta solo el campo faltante. Ahorra ~80% de tokens vs full regen.
3. **Contract-driven**: el contrato JSON actúa como plano; el LLM solo
   materializa, no inventa estructura.
4. **Baseline de errores**: solo se envían al LLM los errores **nuevos**
   (diff contra snapshot pre-generación), no toda la salida de `tsc`/`dotnet`.
5. **Context extractor local**: se le pasan al LLM solo archivos relevantes
   (módulo detectado), no el repo completo.
6. **Engram memory**: recuerda decisiones previas por feature → evita reiterar
   contexto entre runs.
7. **Rollback transaccional**: si una generación fracasa, no se reintenta
   sobre código corrupto; se vuelve al baseline limpio.

## Cadena LLM (resumen)

Ver detalles en [`PROVIDERS.md`](./PROVIDERS.md).

```
groq (5 modelos) → cerebras (2) → gemini (3) → ollama (1, local)
```

Política:

- Rate-limit **corto** (< `LLM_LONG_RATE_LIMIT_MS`, default 60s) → espera y reintenta.
- Rate-limit **largo** (≥ threshold) → salta al siguiente **proveedor**
  (no al siguiente modelo del mismo), para no perder tiempo.
- Error no recuperable → salta al siguiente modelo del mismo proveedor.

## Contratos de archivos generados

### Backend (.NET Vertical Slice)

Todos los DTOs de una operación conviven en el mismo namespace que su
Query/Handler/Endpoint, para evitar `using` cruzados:

```
Core/{Module}/NitroGroups.Core.{Module}.Application/UseCases/{Feature}/{Operation}/
  ├── {Operation}{Feature}Request.cs
  ├── {Feature}Response.cs
  ├── {Operation}{Feature}Query.cs    (o Command)
  └── {Operation}{Feature}QueryHandler.cs

Core/{Module}/NitroGroups.Core.{Module}.Infrastructure/Endpoints/{Feature}/
  └── {Operation}.cs                    (IEndpoint)
```

### Frontend (React + TanStack Query)

```
UI/nitro-groups/src/features/{feature}/
  ├── types/{feature}.types.ts
  ├── services/{feature}.service.ts
  ├── hooks/use{Feature}.ts
  └── components/{Feature}Panel.tsx
```

## Decisiones de diseño no obvias

- **DTOs en mismo folder que Query/Handler**: decisión tomada tras INC-20260421-02.
  La convención previa (subcarpetas `/Requests` y `/Responses`) exigía `using`
  cruzados que el LLM olvidaba con frecuencia.
- **Repair in-place vs patch files**: los "patch files sintéticos" (`B2BContractPatch_*`)
  fueron eliminados en v1.0 porque ensuciaban el repo y no resolvían
  los errores de compilación subyacentes.
- **Multi-provider antes que Ollama local**: cloud (Groq/Cerebras/Gemini) es
  más rápido y preciso que local. Ollama es red de seguridad, no default.
- **Smoke test sin LLM**: `__smokeTest.ts` valida el pipeline determinista
  contra el contrato real. Es la prueba de regresión rápida (≈5s).
