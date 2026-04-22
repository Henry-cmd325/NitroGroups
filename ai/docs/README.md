# Documentación del Orquestador NitroGroups

Este directorio contiene la documentación oficial del orquestador de generación
full-stack basado en IA. Está pensada como fuente de verdad para entender cómo
funciona, por qué existe cada pieza, qué fallas se han visto en producción y
cómo se han corregido.

## Índice

| Documento | Propósito |
|-----------|-----------|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Arquitectura v1.0: módulos, fases, flujo de datos y fallbacks. |
| [`PROVIDERS.md`](./PROVIDERS.md) | Cadena multi-proveedor LLM (Groq → Cerebras → Gemini → Ollama), tuning y diagnóstico. |
| [`INCIDENTS.md`](./INCIDENTS.md) | Bitácora cronológica de incidentes reales, causa raíz y corrección aplicada. |
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial versionado del orquestador. |

## Convención de actualización

Cada vez que el orquestador cambie:

1. **Bug nuevo detectado** → entrada en `INCIDENTS.md` con formato `INC-YYYYMMDD-NN`.
2. **Fix o mejora aplicada** → línea correspondiente en `CHANGELOG.md` bajo la versión en curso.
3. **Cambio arquitectónico** → actualizar la sección relevante de `ARCHITECTURE.md`.
4. **Ajuste de proveedores o modelos** → actualizar `PROVIDERS.md`.

## Cómo documentar un incidente

Plantilla mínima para `INCIDENTS.md`:

```
### INC-YYYYMMDD-NN — Título corto
**Fecha:** YYYY-MM-DD
**Severidad:** crítico | alto | medio | bajo
**Fase afectada:** <generación | validación | quality gates | ...>
**Síntoma:** qué vio el usuario.
**Causa raíz:** qué pasó realmente en el código.
**Fix aplicado:** archivos/cambios concretos (referencias como `archivo.ts:función`).
**Verificación:** cómo se probó que quedó cerrado (smoke test, run real, etc.).
```

## Comandos útiles

```bash
# Correr el orquestador completo
npm run ai generate-feature <feature>

# Ver estado de la cadena LLM
npm run ai providers

# Correr el smoke test del orquestador
npx ts-node --transpile-only ai/orchestrator/__smokeTest.ts
```
