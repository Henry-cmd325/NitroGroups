import type { FieldProps } from "./types";

/** Control de formulario: relleno fondo-2, sin borde, anillo acento al enfocar (DESIGN.md → Inputs). */
export const fieldClass =
  "block h-12 w-full bg-fondo-2 px-4 text-base text-tinta placeholder:text-tinta-2/70 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acento disabled:opacity-50";

export const hintId = (htmlFor: string) => `${htmlFor}-hint`;

export function Field({ label, htmlFor, required, hint, children }: FieldProps) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-tinta">
          {label}
          {required && <span className="text-tinta-2"> (obligatorio)</span>}
        </label>
        {hint && (
          <span id={hintId(htmlFor)} className="text-sm text-tinta-2">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
