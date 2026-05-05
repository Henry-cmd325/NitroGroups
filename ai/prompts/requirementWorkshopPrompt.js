"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContractReconciliationPrompt = exports.buildContractSynthesisPrompt = exports.buildAnalysisPrompt = void 0;
const backendTypeMapping_1 = require("./shared/backendTypeMapping");
function buildAnalysisPrompt(feature, requirement, dbSchema, domainContext) {
    return `
Eres arquitecto de producto y analista de requisitos en NitroGroups (SaaS multi-módulo .NET + Next.js).

NOMBRE DE FEATURE (camelCase, estable): ${feature}

=== REQUERIMIENTO (texto del usuario) ===
${requirement}
===

${dbSchema ? `=== SCHEMA / DATOS (contexto) ===\n${dbSchema}\n` : ""}
${domainContext ? `=== ENTIDADES DE DOMINIO C# EXISTENTES (si aplica) ===\n${domainContext}\n` : ""}

TAREA:
1) Resume en 2-4 oraciones el entendimiento del requisito.
2) Genera entre **4 y 8** preguntas que reduzcan ambigüedad antes de diseñar un contrato B2B y el código. Prioriza: alcance, datos a exponer, filtros (p. ej. groupId, tenant), permisos, paginación, reglas de negocio, idempotencia, errores, formatos.
3) Cada pregunta debe ser accionable (no genérica).

SALIDA OBLIGATORIA: **solo** un bloque JSON (sin prosa alrededor), así:

\`\`\`json
{
  "summary": "texto",
  "questions": [
    { "id": "q1", "text": "Pregunta clara al usuario", "context": "Para qué sirve en el diseño" }
  ]
}
\`\`\`
`;
}
exports.buildAnalysisPrompt = buildAnalysisPrompt;
function buildContractSynthesisPrompt(feature, requirement, qaText, dbSchema, domainContext) {
    const typeTable = (0, backendTypeMapping_1.buildBackendTypeMappingTable)();
    return `
Eres arquitecto B2B de NitroGroups. Debes producir un **único** contrato JSON alineado con el validador del orquestador.

FEATURE (string): ${feature}
El campo "feature" del contrato **debe** ser exactamente: "${feature}"

MAPEO TIPOS (respetar format en campos; dogma B2B):
${typeTable}

${dbSchema ? `=== SCHEMA ===\n${dbSchema}\n` : ""}
${domainContext ? `=== DOMINIO C# (no inventar propiedades que contradicen) ===\n${domainContext}\n` : ""}

=== REQUERIMIENTO ===
${requirement}
===

=== RESPUESTAS A LAS PREGUNTAS DE ACLARATORIA ===
${qaText}
===

REGLAS DEL CONTRATO:
- "v": "1.0.0", "entityHash": "INITIAL_SIGNATURE" (si no se calcula aún)
- "endpoint": "/api/..." (minúsculas razonable, plural si es colección)
- "auth": true salvo acuerde explícitamente anónimo
- "scope.allowedEndpoints": **obligatorio** alinear con "methods" de UNA de estas formas (el validador unifica kebab y camel):
  1) **Recomendado:** verbos HTTP en minúscula: "get", "post", "put", "patch", "delete" — uno por cada tipo de operación; encajan con el campo "http" de cada método.
  2) **Alternativa:** nombres en kebab acordes con el "name" del método, p. ej. "list-availability" con método "name": "listAvailability" (misma semántica sin guiones: listavailability).
- **Nunca** declares en allowedEndpoints cadenas que no correspondan a ningún método (ni por http ni por nombre).
- Cada "methods[]": "name" (camelCase al estilo use case), "http" (GET|POST|PUT|PATCH|DELETE). **No** añadas "endpoint" por método a menos que vuestro pipeline de contrato lo soporte (el B2B estándar no lo usa)
- "request" / "response" con "name" y "fields" { "campo": { "type", "format? optional? } } según mapeo
- Los **nombres** "request" y "response" (name) en JSON deben ser **PascalCase** de clase C# (p. ej. "ListGroupMediaRequest", "GroupMediaListResponse"), nunca *lowerCamel* ambiguos: el orquestador y el validador estructural los buscan como tipos reales.
- Si un GET "list" necesita criterio (p. ej. groupId), declara request.fields; no dejes dudas de alcance
- "businessRules": { "precision"?: "decimal", "notes"?: "..." }

SALIDA: **solo** un bloque \`\`\`json ... \`\`\` con el contrato completo, sin comentarios dentro del JSON.

NOTA: En campos de request, \`"in": "path"\` es de OpenAPI (parámetro de ruta), **no** un nombre de archivo. No afecta a \`[FILE: ...]\` en fases de código.
`;
}
exports.buildContractSynthesisPrompt = buildContractSynthesisPrompt;
/**
 * Segunda pasada tras la síntesis inicial: alinea el contrato con el requisito y las
 * respuestas Q&A (rigen sobre el borrador; el dominio C# aporta nombres de campos, no
 * criterio de producto). Evita el típico descaje “modelo lindo pero negocio incorrecto”.
 */
function buildContractReconciliationPrompt(feature, requirement, qaText, draftContractJson, dbSchema, domainContext) {
    const typeTable = (0, backendTypeMapping_1.buildBackendTypeMappingTable)();
    const qaBlock = qaText && qaText.trim()
        ? `=== RESPUESTAS Q&A (prioridad: si chocan con el borrador, gana el Q&A) ===\n${qaText}\n`
        : "(No hay tramo Q&A: usa solo el requisito y el borrador.)\n";
    return `
Eres revisor estricto de contratos B2B en NitroGroups. Recibes un **borrador** que puede
ser coherente sintácticamente pero **inconsistente** con el requisito o con las
decisiones explícitas del taller (Q&A).

FEATURE: ${feature} (el campo "feature" del JSON final debe ser exactamente "${feature}")

MAPEO TIPOS (respetar):
${typeTable}

${dbSchema ? `=== SCHEMA (contexto) ===\n${dbSchema}\n` : ""}
${domainContext ? `=== DOMINIO C# (usar nombres de entidad, no reescribir el modelo) ===\n${domainContext}\n` : ""}

=== REQUERIMIENTO (prioridad con Q&A) ===
${requirement}
===

${qaBlock}

=== BORRADOR DE CONTRATO (JSON) A CORREGIR/ALINEAR ===
${draftContractJson}
===

TAREA:
1) Compara requisito + Q&A con el borrador. Detecta contradicciones, omisiones y campos
   que el negocio exige (p. ej. fechas para orden tipo feed, cursor vs paginado, permisos
   de lectura frente a escritura, optionalidad de flags de v1, IDs en ítems de lista,
   dónde se generan URLs firmadas según dónde viva el servicio).
2) Producir un **único** JSON de contrato B2B **completo** que pase el validador del
   orquestador: scope.allowedEndpoints alineado con methods, GET con criterio en
   request.fields para listas filtrables, reglas de negocio en businessRules.notes.
3) **No** inventes métodos de escritura en Core si el requisito dice que el binario
   vía otra pila (p. ej. Next/Storage). Ajusta notas, no añadas UseCases inexistentes.
4) Donde el borrador pida campos obligatorios que el Q&A marcó como innecuarios en v1
   (p. ej. isPrimary), pásalos a optional: true o documenta "siempre false" en notes.
5) Si añades campos (uploadedAt, id, nextCursor, sort): respeta mapeo de format (p. ej.
   iso-date-time para fechas). Conserva "v", "entityHash" salvo unificación obvia.

SALIDA: **solo** un bloque \`\`\`json ... \`\`\` con el contrato completo, sin prosa.
`;
}
exports.buildContractReconciliationPrompt = buildContractReconciliationPrompt;
