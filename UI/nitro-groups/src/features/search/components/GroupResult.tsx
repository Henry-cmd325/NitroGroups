import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { priceLabel } from "@/lib/format";
import { profileHref } from "../searchParams";
import type { GroupSearchItem } from "../types";

/** Un grupo en los resultados: la foto manda, el nombre en voz de cartel. */
export function GroupResult({ group, date, priority = false }: { group: GroupSearchItem; date?: string; priority?: boolean }) {
    const href = profileHref(group.slug, date);

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
                <h3 className="font-[family-name:var(--font-display)] font-semibold text-[1.5rem] leading-tight text-tinta">
                    <Link href={href} className="no-underline after:absolute after:inset-0 hover:text-acento transition-colors">
                        {group.groupName}
                    </Link>
                </h3>
                <p className="text-tinta-2">
                    {[group.genres.slice(0, 3).join(", "), group.locationText].filter(Boolean).join(" en ")}
                </p>
                {group.description && <p className="text-tinta max-w-[56ch] line-clamp-2">{group.description}</p>}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                    <span className="text-xl font-semibold text-tinta tabular">{priceLabel(group)}</span>
                    {group.totalReviews > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-tinta-2 tabular">
                            <Star className="size-4 fill-acento text-acento" aria-hidden />
                            {group.averageRating.toFixed(1)}
                            <span className="sr-only">de 5,</span> ({group.totalReviews} reseñas)
                        </span>
                    )}
                    {group.isVerified && (
                        <span className="inline-flex items-center gap-1.5 text-tinta-2">
                            <BadgeCheck className="size-4 text-acento" aria-hidden />
                            Verificado
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}
