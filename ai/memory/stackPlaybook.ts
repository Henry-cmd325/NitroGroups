/**
 * Conocimiento fijado del stack NitroGroups — se inyecta en **cada** run de
 * generación LLM junto con `errorDigest` (errores históricos en errors.json).
 *
 * Rationale: muchos fallos (Npgsql UTC, rutas front ≠ contrato, JWT audience)
 * no aparecen hasta runtime; no pueden depender solo de append a errors.json.
 */

/** Bloque markdown para el prompt backend (handlers, endpoints, EF en prompts). */
export function getStackPlaybookBackend(): string {
    return `

=== PLAYBOOK DEL REPO — BACKEND / EF / API (OBLIGATORIO) ===
1) **PostgreSQL + Npgsql + \`timestamp with time zone\`:** al guardar \`DateTimeOffset\`, el offset debe ser **UTC (+00:00)**. Si parseas ISO desde el cliente con \`DateTimeOffset.Parse(..., DateTimeStyles.RoundtripKind)\`, aplica **\`.ToUniversalTime()\`** antes de asignar a la entidad. En Infrastructure, un **\`HasConversion\`** en propiedades \`StartAt\`/\`EndAt\` que llame \`ToUniversalTime()\` al materializar hacia la columna evita repetir el bug en cualquier handler.
2) **Contrato B2B ↔ rutas:** el \`endpoint\` del contrato (p. ej. \`api/groups/{groupId}/schedule\`) es la fuente de verdad. No generes handlers con path distinto al que consumirá el front; si el nombre del recurso cambia (\`schedule\` vs \`availabilities\`), el contrato y el cliente deben coincidir.
3) **Auth JWT:** los endpoints con \`RequireAuthorization()\` validan \`Auth0:Authority\` + \`Auth0:Audience\` en el API; el token de acceso debe pedirse con el **mismo** API identifier (\`aud\`) que \`Auth0:Audience\`.
`;
}

/** Bloque markdown para el prompt frontend (servicios, hooks, panel). */
export function getStackPlaybookFrontend(): string {
    return `

=== PLAYBOOK DEL REPO — FRONT (OBLIGATORIO) ===
1) **Base URL:** peticiones \`/api/...\` coherentes con \`next.config\` rewrites; \`BACKEND_API_URL\` debe incluir el sufijo \`/api\` (mismo criterio que \`normalizeBackendApiBaseUrl\`).
2) **Rutas vs contrato:** los paths en \`apiClient.get/post/...\` deben reflejar el contrato B2B (\`endpoint\` y \`method\`), no nombres legacy de otra versión del API.
`;
}
