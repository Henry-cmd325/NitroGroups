import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  /**
   * En línea: un indicador del tamaño del texto, para botones y filas. Sin `inline`, cubre la
   * pantalla mientras termina una acción que bloquea la página.
   */
  inline?: boolean;
  /** Texto para lectores de pantalla. */
  label?: string;
}

export default function Loader({ className, inline = false, label = "Cargando…" }: LoaderProps) {
  if (inline) {
    return (
      <span role="status" className={cn("inline-flex", className)}>
        <span aria-hidden className="spinner !size-[1em] !border-2" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <div role="status" className={cn("fixed inset-0 z-50 grid place-items-center bg-telon/75", className)}>
      <span aria-hidden className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
