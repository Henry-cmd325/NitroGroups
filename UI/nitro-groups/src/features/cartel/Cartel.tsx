"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { priceLabel, shortDateParts, todayInMexico } from "@/lib/format";
import { profileHref } from "@/features/search/searchParams";
import type { GroupSearchItem, PagedResult } from "@/features/search/types";
import { Monument } from "./Monument";

interface CartelProps {
    dates: string[];
    initialDate: string;
    initialGroups: GroupSearchItem[];
    /** Título y frase de la portada, arriba a la izquierda. */
    intro: React.ReactNode;
    /** La acción principal, abajo a la derecha. */
    action: React.ReactNode;
}

async function fetchFreeGroups(date: string): Promise<GroupSearchItem[]> {
    const res = await fetch(`/api/groups/search?${new URLSearchParams({ date, size: "8" })}`);
    if (!res.ok) throw new Error(String(res.status));
    return ((await res.json()) as PagedResult<GroupSearchItem>).items;
}

/**
 * El cartel de la portada: eliges el día de tu fiesta y el cartel se reimprime con el nombre
 * de un grupo que tiene ese día libre. Es la búsqueda real, no una animación.
 */
export function Cartel({ dates, initialDate, initialGroups, intro, action }: CartelProps) {
    const id = useId();
    const [date, setDate] = useState(initialDate);
    const [groups, setGroups] = useState(initialGroups);
    const [index, setIndex] = useState(0);
    const [failed, setFailed] = useState(false);
    const [pending, startTransition] = useTransition();
    const otherDate = useRef<HTMLInputElement>(null);

    function choose(next: string) {
        if (!next || next === date) return;
        setDate(next);
        startTransition(async () => {
            try {
                setGroups(await fetchFreeGroups(next));
                setIndex(0);
                setFailed(false);
            } catch {
                setFailed(true);
            }
        });
    }

    const group = groups[index];
    const parts = shortDateParts(date);
    const dateLine = parts ? `${parts.weekday} ${parts.day} ${parts.month}` : date;

    const chooser = (
        <fieldset>
            <legend className="font-semibold">¿Qué día es tu fiesta?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
                {dates.map((d) => {
                    const p = shortDateParts(d);
                    const active = d === date;
                    return (
                        <button
                            key={d}
                            type="button"
                            aria-pressed={active}
                            onClick={() => choose(d)}
                            className={`h-12 min-w-[5.5rem] px-4 font-semibold tabular transition-[background-color,transform] active:scale-[0.97] ${active ? "bg-tinta text-fondo" : "bg-fondo-2 hover:bg-fondo-3"}`}
                        >
                            {p ? `${p.weekday} ${p.day} ${p.month}` : d}
                        </button>
                    );
                })}
                <label htmlFor={`${id}-otra`} className="sr-only">Otra fecha</label>
                <input
                    ref={otherDate}
                    id={`${id}-otra`}
                    type="date"
                    min={todayInMexico()}
                    onChange={(e) => choose(e.target.value)}
                    className="h-12 bg-fondo-2 px-4 [color-scheme:light] outline-none focus-visible:outline-2 focus-visible:outline-acento"
                />
            </div>
        </fieldset>
    );

    return (
        <div className="flex flex-col gap-[clamp(2.5rem,7vh,4.5rem)]">
            <div className="grid lg:grid-cols-12 gap-x-6 gap-y-6">
                <div className="lg:col-span-5">{intro}</div>
                <div className="lg:col-span-7 lg:justify-self-end">{chooser}</div>
            </div>

            {/* El cartel. aria-live para que el cambio de grupo también se escuche. */}
            <div aria-live="polite" aria-busy={pending} className={`transition-opacity duration-300 ${pending ? "opacity-50" : ""}`}>
                <div key={group?.id ?? "vacio"} className="cartel-swap monument-scroll">
                    {group ? (
                        <Link href={profileHref(group.slug, date)} className="block no-underline hover:text-acento transition-colors">
                            <Monument name={group.groupName} />
                        </Link>
                    ) : (
                        <Monument name="Fecha sin cartel" />
                    )}
                </div>
                <div className="mt-[clamp(1rem,2vw,1.75rem)] flex flex-wrap items-center justify-between gap-x-8 gap-y-4 text-[clamp(1.0625rem,1.3vw,1.25rem)]">
                    {group ? (
                        <p>
                            <span className="type-heading uppercase tabular">
                                {dateLine}
                                {group.locationText && ` en ${group.locationText.split(",")[0]}`}
                            </span>
                            <br />
                            <span className="font-semibold">{group.genres[0] ?? "Música en vivo"}</span>
                            {", "}
                            <span className="tabular">{priceLabel(group).toLowerCase()}</span>
                            {group.totalReviews > 0 && <span className="text-tinta-2">{`, ${group.averageRating.toFixed(1)} de 5 en ${group.totalReviews} reseñas`}</span>}
                        </p>
                    ) : (
                        <p>
                            <span className="type-heading uppercase tabular">{dateLine}</span>
                            <br />
                            {failed ? "No pudimos revisar esa fecha. Inténtalo otra vez." : "Ningún grupo tiene libre ese día todavía. Prueba otra fecha."}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                        {groups.length > 1 && (
                            <button
                                type="button"
                                onClick={() => setIndex((index + 1) % groups.length)}
                                className="group inline-flex items-center gap-2 font-semibold underline decoration-2 underline-offset-4 hover:text-acento"
                            >
                                Otro grupo libre ({index + 1} de {groups.length})
                                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
                            </button>
                        )}
                        {action}
                    </div>
                </div>
            </div>
        </div>
    );
}
