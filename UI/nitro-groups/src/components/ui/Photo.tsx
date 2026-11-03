import { cn } from "@/lib/utils";
import { PapelPicado } from "@/features/cartel/PapelPicado";

interface PhotoProps {
    src: string | null | undefined;
    alt: string;
    /** Nombre del grupo (lo usan los lectores de pantalla cuando no hay foto). */
    fallbackTitle?: string;
    className?: string;
    priority?: boolean;
}

/**
 * Foto de un grupo, recortada y con esquinas rectas. Sin foto, un cartel con la inicial
 * del grupo: nunca una imagen genérica que finja ser el grupo.
 */
export function Photo({ src, alt, className, priority = false }: PhotoProps) {
    if (!src) {
        // Sin foto: una banderita de papel picado, nunca una imagen genérica que finja ser el grupo.
        return (
            <div
                role="img"
                aria-label={`${alt} (todavía sin fotos)`}
                className={cn("relative overflow-hidden bg-fondo-2", className)}
            >
                <PapelPicado colors={["#B591F4"]} count={1} className="absolute left-1/2 top-[8%] h-[70%] -translate-x-1/2" />
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden bg-fondo-2", className)}>
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
