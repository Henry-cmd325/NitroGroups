import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { priceLabel } from "@/lib/format";
import { profileHref } from "@/features/search/searchParams";
import type { GroupSearchItem } from "@/features/search/types";

/** Tarjeta de grupo: foto arriba, género, nombre y precio. Toda la tarjeta es el enlace. */
export function GroupCard({ group, date }: { group: GroupSearchItem; date?: string }) {
    return (
        <article className="group relative superficie rounded-xl p-2 hover:border-[#34304A]">
            <Photo
                src={group.imageUrl}
                alt={`${group.groupName} en vivo`}
                fallbackTitle={group.groupName}
                className="aspect-[16/10] w-full rounded-lg"
            />
            <div className="px-3 pt-4 pb-3">
                <p className="inline-flex rounded bg-fondo-3 px-2 py-0.5 text-[0.8125rem] text-tinta-2">
                    {group.genres[0] ?? "Música en vivo"}
                </p>
                <h3 className="mt-3 font-[family-name:var(--font-sans)] font-normal text-[1.125rem] leading-snug">
                    <Link href={profileHref(group.slug, date)} className="no-underline after:absolute after:inset-0 after:rounded-xl">
                        {group.groupName}
                    </Link>
                </h3>
                <p className="mt-1 text-base text-tinta-2">{group.locationText}</p>
                <p className="mt-4 flex items-center justify-between text-base">
                    <span className="tabular">{priceLabel(group)}</span>
                    <span className="inline-flex items-center gap-1 text-[0.875rem] font-[family-name:var(--font-display)] font-semibold text-tinta-2 transition-colors duration-300 group-hover:text-acento">
                        Ver grupo <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                    </span>
                </p>
            </div>
        </article>
    );
}
