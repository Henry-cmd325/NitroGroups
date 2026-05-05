"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRequirementFilePath = void 0;
const path_1 = __importDefault(require("path"));
const paths_1 = require("../config/paths");
/**
 * Resuelve `--file=` del requirement-workshop:
 * - Solo nombre (`groupAvailability.md`) → `{repo}/ai/requirements/groupAvailability.md`
 * - Ruta relativa con carpetas (`docs/otro.md`, `ai/requirements/x.md`) → respecto a la raíz del repo
 * - Ruta absoluta → sin cambiar (normalizada)
 */
function resolveRequirementFilePath(fileArg, projectRoot) {
    const trimmed = fileArg.trim();
    if (!trimmed)
        return trimmed;
    if (path_1.default.isAbsolute(trimmed)) {
        return path_1.default.normalize(trimmed);
    }
    if (!/[\\/]/.test(trimmed)) {
        return path_1.default.join(projectRoot, paths_1.PATHS.requirements, trimmed);
    }
    return path_1.default.resolve(projectRoot, trimmed);
}
exports.resolveRequirementFilePath = resolveRequirementFilePath;
