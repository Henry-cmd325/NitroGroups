# Cadena LLM del Orquestador

Diseño, configuración y política de failover de la cadena multi-proveedor.

## Orden por defecto

```
groq → cerebras → gemini → ollama
```

Controlado por `AI_PROVIDER_ORDER` en `ai/.env`:

```env
AI_PROVIDER_ORDER=groq,cerebras,gemini,ollama
```

## Proveedores soportados

| Proveedor | Tipo | API Spec | Uso recomendado | Modelos default |
|-----------|------|----------|-----------------|-----------------|
| **groq** | Cloud, free tier | OpenAI-compat | Primer recurso: rápido y barato | `llama-3.3-70b-versatile`, `qwen/qwen3-32b`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`, `gemma2-9b-it` |
| **cerebras** | Cloud, free tier | OpenAI-compat | Fallback primario sin rate-limit de Groq. Nota: `gpt-oss-120b` aparece en `/models` pero **404 en tier libre** (ver INC-20260421-08). | `qwen-3-235b-a22b-instruct-2507`, `llama3.1-8b` |
| **gemini** | Cloud, free tier | OpenAI-compat (beta) | Fallback secundario: capacidad diversa | `gemini-2.0-flash-exp`, `gemini-1.5-flash`, `gemini-1.5-pro` |
| **ollama** | Local | OpenAI-compat | Último recurso offline | `qwen2.5-coder:3b-instruct` |

## Variables de entorno

```env
# Orden de la cadena (coma-separado)
AI_PROVIDER_ORDER=groq,cerebras,gemini,ollama

# Política de failover
LLM_LONG_RATE_LIMIT_MS=60000        # >60s rate-limit → salta a siguiente proveedor
LLM_MAX_RETRIES_PER_PROVIDER=2      # intentos antes de saltar modelo
LLM_MAX_TOTAL_WAIT_MS=120000        # tope de espera acumulada por run

# Groq
GROQ_API_KEY=gsk_...
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODELS=llama-3.3-70b-versatile,qwen/qwen3-32b,llama-3.1-8b-instant,mixtral-8x7b-32768,gemma2-9b-it

# Cerebras (catálogo real: https://inference-docs.cerebras.ai/models)
# Nota: el listado de /models puede incluir modelos a los que tu tier no tiene acceso (404).
# Verifica empíricamente antes de añadir a la lista.
CEREBRAS_API_KEY=csk-...
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
CEREBRAS_MODELS=qwen-3-235b-a22b-instruct-2507,llama3.1-8b

# Gemini (endpoint OpenAI-compat)
GEMINI_API_KEY=AIza...
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODELS=gemini-2.0-flash-exp,gemini-1.5-flash,gemini-1.5-pro

# Ollama (local)
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODELS=qwen2.5-coder:3b-instruct
```

## Política de failover

Pseudocódigo efectivo de `ai/client.ts`:

```
for provider in chain:
  for model in provider.models:
    for attempt in 1..maxRetries:
      try:
        return provider.generate(model, prompt)
      except RateLimitError(waitMs):
        if waitMs > LLM_LONG_RATE_LIMIT_MS:   # e.g. 60s
          → continue al siguiente PROVIDER       (skip models hermanos)
        elif lastAttempt:
          → continue al siguiente MODEL
        elif totalWait + waitMs > maxTotal:
          → continue al siguiente MODEL
        else:
          sleep(waitMs); retry mismo model
      except OtherError:
        → continue al siguiente MODEL
```

### Racional

- **Rate-limit largo en un modelo del proveedor** = probablemente todo el
  proveedor está saturado (misma cuota compartida por account). No tiene
  sentido seguir pegándole; saltar a otro proveedor.
- **Rate-limit corto** = pico momentáneo; esperar es más barato que cambiar.
- **Error no recuperable** (malformed response, schema error) = el modelo
  no sirve para este prompt; probar siguiente.

## Diagnóstico

### Ver estado de la cadena

```bash
npm run ai providers
```

Salida esperada:

```
🔗 Cadena LLM activa
  [1] groq        ✔ configurado · 5 modelos · ping ok (142ms)
  [2] cerebras    ✔ configurado · 2 modelos · ping ok (98ms)
  [3] gemini      ✔ configurado · 3 modelos · ping ok (210ms)
  [4] ollama      ⚠ no configurado (OLLAMA_HOST no responde)
```

### Logs durante un run

```
🔗 Cadena LLM activa: groq[5] → cerebras[2] → gemini[3] → ollama[1]
🧠 [groq] modelo 'llama-3.3-70b-versatile' (intento 1/2)...
⚠️  [groq:llama-3.3-70b-versatile] rate-limit de 1005.0s (>60s). Saltando al siguiente proveedor.
🧠 [cerebras] modelo 'llama-3.3-70b' (intento 1/2)...
✔ [cerebras:llama-3.3-70b] generación completada (2.3s)
```

## Setup de Ollama (opcional, local)

```bash
# Windows
winget install Ollama.Ollama

# Verificar servicio
curl http://127.0.0.1:11434/api/tags

# Pull del modelo recomendado (≈2GB, encaja en 6GB VRAM)
ollama pull qwen2.5-coder:3b-instruct

# Opcional: 7B si tienes >8GB VRAM (NO recomendado en RTX 4050 6GB)
# ollama pull qwen2.5-coder:7b-instruct
```

**Hardware mínimo sugerido:**

| VRAM | Modelo Ollama recomendado |
|------|---------------------------|
| ≥16GB | `qwen2.5-coder:14b-instruct` |
| 8–12GB | `qwen2.5-coder:7b-instruct` |
| 4–6GB | `qwen2.5-coder:3b-instruct` ← default |
| <4GB | solo cloud (Groq/Cerebras/Gemini) |

## Añadir un nuevo proveedor

1. Crear `ai/providers/{name}Provider.ts` extendiendo `OpenAICompatibleProvider`
   (o implementar `LLMProvider` directo si la API no es OpenAI-compat).
2. Registrarlo en `ai/providers/registry.ts` dentro de `buildAllProviders()`.
3. Añadir variables `{NAME}_API_KEY`, `{NAME}_BASE_URL`, `{NAME}_MODELS` en
   `.env.example` y `.env`.
4. Añadirlo al orden `AI_PROVIDER_ORDER`.
5. Probar con `npm run ai providers`.

## Tuning por caso de uso

| Caso | Config recomendada |
|------|---------------------|
| Dev rápido (tolera rate-limits) | `groq,cerebras` (sin gemini ni ollama) |
| Dev offline | `ollama` (solo local) |
| Producción (reliability > cost) | `cerebras,gemini,groq,ollama` |
| Ahorro máximo de latencia | `LLM_LONG_RATE_LIMIT_MS=10000` (salta agresivo) |
| Ahorro máximo de cuotas | `LLM_LONG_RATE_LIMIT_MS=300000` (tolera esperas largas) |
