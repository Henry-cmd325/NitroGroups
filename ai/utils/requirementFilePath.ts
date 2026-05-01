import path from "path";
import { PATHS } from "../config/paths";

/**
 * Resuelve `--file=` del requirement-workshop:
 * - Solo nombre (`groupAvailability.md`) → `{repo}/ai/requirements/groupAvailability.md`
 * - Ruta relativa con carpetas (`docs/otro.md`, `ai/requirements/x.md`) → respecto a la raíz del repo
 * - Ruta absoluta → sin cambiar (normalizada)
 */
export function resolveRequirementFilePath(fileArg: string, projectRoot: string): string {
    const trimmed = fileArg.trim();
    if (!trimmed) return trimmed;
    if (path.isAbsolute(trimmed)) {
        return path.normalize(trimmed);
    }
    if (!/[\\/]/.test(trimmed)) {
        return path.join(projectRoot, PATHS.requirements, trimmed);
    }
    return path.resolve(projectRoot, trimmed);
}
