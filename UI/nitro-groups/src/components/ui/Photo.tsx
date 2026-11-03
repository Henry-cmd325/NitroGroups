import { cn } from "@/lib/utils";

interface PhotoProps {
    src: string | null | undefined;
    alt: string;
    /** Texto del cartel cuando no hay foto (normalmente el nombre del grupo). */
    fallbackTitle: string;
    className?: string;
    priority?: boolean;
}

/**
 * Foto de un grupo, recortada y con esquinas rectas. Sin foto, un cartel tipográfico con
 * el nombre: nunca una imagen genérica que finja ser el grupo.
 */
export function Photo({ src, alt, fallbackTitle, className, priority = false }: PhotoProps) {
    if (!src) {
        // Sin foto: un cartel con la inicial del grupo, recortada como letra de imprenta.
        // El nombre completo ya está en el encabezado de al lado; aquí no se repite.
        const initial = fallbackTitle.trim().charAt(0).toUpperCase() || "N";
        return (
            <div
                role="img"
                aria-label={`${alt} (todavía sin fotos)`}
                className={cn("relative overflow-hidden bg-telon-3 [container-type:size]", className)}
            >
                <span aria-hidden className="type-poster absolute -bottom-[0.2em] -right-[0.04em] text-[110cqh] leading-[0.8] text-telon-2 select-none">
                    {initial}
                </span>
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden bg-telon-2", className)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fotos de R2 con dominio por grupo */}
            <img
                src={src}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={priority ? "high" : "auto"}
                className="absolute inset-0 size-full object-cover"
            />
        </div>
    );
}
