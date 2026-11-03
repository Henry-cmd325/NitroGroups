import { cn } from "@/lib/utils";

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
export function Photo({ src, alt, fallbackTitle, className, priority = false }: PhotoProps) {
    if (!src) {
        // Sin foto: un fondo sereno con las iniciales del grupo y un poco de luz lila.
        // Nunca una imagen genérica que finja ser el grupo.
        const initials = (fallbackTitle ?? alt)
            .split(/\s+/)
            .filter((w) => w.length > 2)
            .slice(0, 2)
            .map((w) => w[0]!.toUpperCase())
            .join("") || "N";
        return (
            <div
                role="img"
                aria-label={`${alt} (todavía sin fotos)`}
                className={cn("relative overflow-hidden bg-fondo-3 [container-type:size]", className)}
            >
                <span aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_70%_at_70%_20%,rgb(201_184_255/0.18),transparent_70%)]" />
                <svg aria-hidden viewBox="0 0 100 60" className="absolute inset-0 size-full">
                    <text x="50" y="38" textAnchor="middle" fontSize="22" fontWeight="600" letterSpacing="-1" fill="rgb(255 255 255 / 0.14)" style={{ fontFamily: "var(--font-display)" }}>
                        {initials}
                    </text>
                </svg>
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
