/**
 * Extrae un bloque JSON de respuestas LLM (code fence ```json o JSON suelto).
 */
export function extractJsonObjectFromLlmText(raw: string): string | null {
    const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
    if (fenced) return fenced[1].trim();
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
            JSON.parse(trimmed);
            return trimmed;
        } catch {
            return null;
        }
    }
    return null;
}
