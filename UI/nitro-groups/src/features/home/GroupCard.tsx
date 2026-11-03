import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { priceLabel } from "@/lib/format";
import { profileHref } from "@/features/search/searchParams";
import type { GroupSearchItem } from "@/features/search/types";

/** Tarjeta de grupo: foto arriba, género, nombre y precio. Toda la tarjeta es el enlace. */
export function GroupCard({ group, date }: { group: GroupSearchItem; date?: string }) {
    return (
        <article className="group relative superficie rounded-[20px] p-2 transition-[transform,border-color] duration-500 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-[var(--linea-fuerte)]">
            <Photo
                src={group.imageUrl}
                alt={`${group.groupName} en vivo`}
                fallbackTitle={group.groupName}
                className="aspect-[4/3] w-full rounded-[14px]"
            />
            <div className="px-3 pt-4 pb-3">
                <p className="inline-flex rounded-full bg-fondo-3 px-2.5 py-0.5 text-[0.8125rem] text-tinta-2">
                    {group.genres[0] ?? "Música en vivo"}
                </p>
                <h3 className="mt-3 text-[1.125rem] font-medium tracking-[-0.02em]">
                    <Link href={profileHref(group.slug, date)} className="no-underline after:absolute after:inset-0 after:rounded-[20px]">
                        {group.groupName}
                    </Link>
                </h3>
                <p className="mt-1 text-base text-tinta-2">{group.locationText}</p>
                <p className="mt-4 flex items-center justify-between text-base">
                    <span className="tabular">{priceLabel(group)}</span>
                    <ArrowUpRight className="size-4 text-tinta-2 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-acento" aria-hidden />
                </p>
            </div>
        </article>
    );
}
