import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { ROUTES } from "@/config/routes";
import { formatPrice } from "@/lib/format";
import type { GroupSearchItem } from "../types";

function priceLine(g: GroupSearchItem) {
    const base = formatPrice(g.basePrice, g.currency);
    if (base) return `Desde ${base}`;
    const hourly = formatPrice(g.hourlyRate, g.currency);
    if (hourly) return `${hourly} por hora`;
    return "Precio a cotizar";
}

/** Un grupo en los resultados: la foto manda, el nombre en voz de cartel. */
export function GroupResult({ group, date, priority = false }: { group: GroupSearchItem; date?: string; priority?: boolean }) {
    const href = date ? `${ROUTES.GROUPS.PUBLIC_PROFILE(group.slug)}?fecha=${date}` : ROUTES.GROUPS.PUBLIC_PROFILE(group.slug);

    return (
        <article className="group/result relative grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-10 gap-y-5">
            <Photo
                src={group.imageUrl}
                alt={`${group.groupName} en vivo`}
                fallbackTitle={group.groupName}
                priority={priority}
                className="aspect-[4/3] w-full"
            />
            <div className="flex flex-col justify-center gap-4 md:py-4">
                <h3 className="type-poster text-[clamp(2.25rem,4.5vw,3.75rem)] text-papel">
                    <Link href={href} className="no-underline after:absolute after:inset-0 hover:text-tungsteno transition-colors">
                        {group.groupName}
                    </Link>
                </h3>
                <p className="text-papel-2">
                    {[group.genres.slice(0, 3).join(", "), group.locationText].filter(Boolean).join(" en ")}
                </p>
                {group.description && <p className="text-papel max-w-[56ch] line-clamp-2">{group.description}</p>}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                    <span className="text-xl font-semibold text-papel tabular">{priceLine(group)}</span>
                    {group.totalReviews > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-papel-2 tabular">
                            <Star className="size-4 fill-tungsteno text-tungsteno" aria-hidden />
                            {group.averageRating.toFixed(1)}
                            <span className="sr-only">de 5,</span> ({group.totalReviews} reseñas)
                        </span>
                    )}
                    {group.isVerified && (
                        <span className="inline-flex items-center gap-1.5 text-papel-2">
                            <BadgeCheck className="size-4 text-tungsteno" aria-hidden />
                            Verificado
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}
