import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { serverGet } from "@/lib/serverApi";
import { priceLabel, todayInMexico, upcomingPartyDates } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { Cartel } from "@/features/cartel/Cartel";
import { PapelPicado } from "@/features/cartel/PapelPicado";
import { Monument } from "@/features/cartel/Monument";
import type { GenreOption, GroupSearchItem, PagedResult } from "@/features/search/types";

/** Las tres cosas que haces, cada una con su pantalla. Los verbos son el encabezado. */
const VERBS = [
    {
        verb: "Busca",
        body: "Elige el día de tu fiesta. Solo ves grupos que tienen esa fecha libre, con su precio a la vista.",
        field: "bg-fondo-2 text-tinta",
        flags: ["#4B12B8", "#1D0736", "#B591F4"],
    },
    {
        verb: "Pide",
        body: "Cuéntale al grupo qué celebras, dónde, cuántas horas y tu presupuesto. Todo en una sola solicitud.",
        field: "bg-acento text-fondo",
        flags: ["#D6BEFF", "#1D0736", "#B591F4"],
    },
    {
        verb: "Confirma",
        body: "El grupo acepta o te propone otra cosa. La conversación queda por escrito, con la fecha y el precio.",
        field: "campo-tinta",
        flags: ["#D6BEFF", "#4B12B8", "#B591F4"],
    },
];

/** Los cuatro paneles de la banda, en el orden de una fiesta: llegada, baile, cena, madrugada. */
const BAND = [
    { slug: "mariachi", name: "Mariachi", line: "Para la salida de la iglesia y la serenata", grow: "md:grow-[5]", field: "bg-acento text-fondo", flags: ["#D6BEFF", "#B591F4"] },
    { slug: "banda-sinaloense", name: "Banda", line: "Para que nadie se siente", grow: "md:grow-[2]", field: "bg-fondo-3", flags: ["#4B12B8", "#1D0736"] },
    { slug: "cumbia", name: "Cumbia", line: "Para la pista llena", grow: "md:grow-[3]", field: "campo-tinta", flags: ["#D6BEFF", "#B591F4"] },
    { slug: "trio-romantico", name: "Trío", line: "Para la cena", grow: "md:grow-[2]", field: "bg-fondo-2", flags: ["#4B12B8", "#1D0736"] },
];

export default async function Home() {
    const dates = upcomingPartyDates(todayInMexico(), 5);
    const firstDate = dates[0];
    const [genres, free, listing] = await Promise.all([
        serverGet<GenreOption[]>("/genres", 3600),
        serverGet<PagedResult<GroupSearchItem>>(`/groups/search?${new URLSearchParams({ date: firstDate, size: "8" })}`, 60),
        serverGet<PagedResult<GroupSearchItem>>("/groups/search?size=10", 120),
    ]);
    const rows = listing?.items ?? [];
    const bandSlugs = new Set((genres ?? []).map((g) => g.slug));

    return (
        <>
            {/* El cartel: eliges el día y el nombre del grupo libre va de margen a margen. */}
            <section className="page-frame pt-6 pb-10" aria-labelledby="titulo">
                {firstDate && (
                    <Cartel
                        dates={dates}
                        initialDate={firstDate}
                        initialGroups={free?.items ?? []}
                        intro={
                            <>
                                <h1 id="titulo" className="type-heading text-[clamp(1.75rem,2.6vw,2.5rem)]">
                                    Música en vivo para tu fecha
                                </h1>
                                <p className="mt-3 max-w-[40ch] text-[clamp(1.0625rem,1.3vw,1.25rem)]">
                                    Mariachi, banda, cumbia y trío para tu boda, tus XV años o la fiesta de la empresa,
                                    con su precio a la vista.
                                </p>
                            </>
                        }
                        action={
                            <Link
                                href={ROUTES.GROUPS.SEARCH}
                                className="inline-flex h-14 items-center gap-3 px-7 bg-acento text-fondo font-semibold no-underline hover:bg-acento-press active:scale-[0.98] transition-[background-color,transform]"
                            >
                                Ver todos los grupos
                                <ArrowRight className="size-5" aria-hidden />
                            </Link>
                        }
                    />
                )}
            </section>

            {/* Cartelera: el precio de cada grupo sin tener que cotizar. */}
            {rows.length > 0 && (
                <section className="page-frame mt-[var(--section-gap)]" aria-labelledby="cartelera" data-reveal>
                    <h2 id="cartelera" className="type-poster text-[clamp(2.5rem,4.5vw,4.25rem)] md:pl-[3vw] max-w-[18ch]">
                        Precio a la vista
                    </h2>
                    <div className="mt-24 grid lg:grid-cols-12 gap-x-6 gap-y-12">
                        <div className="lg:col-span-4 lg:self-end order-2 lg:order-1 w-[60%] md:w-[40%] lg:w-auto justify-self-end lg:justify-self-auto">
                            <Photo
                                src={rows.find((r) => r.imageUrl)?.imageUrl}
                                alt={rows[0].groupName}
                                fallbackTitle={rows[0].groupName}
                                className="aspect-[4/5] w-full"
                            />
                        </div>
                        <p className="hidden lg:block lg:col-start-7 lg:col-span-1 text-sm text-tinta-2 pt-1">Cartelera</p>
                        <ul className="lg:col-start-8 lg:col-span-5 order-1 lg:order-2">
                            {rows.map((g, i) => (
                                <li key={g.id} className={i > 0 && i % 4 === 0 ? "mt-11" : i > 0 ? "mt-6" : ""}>
                                    <Link href={ROUTES.GROUPS.PUBLIC_PROFILE(g.slug)} className="group grid grid-cols-[1fr_auto] md:grid-cols-[30%_1fr_auto] gap-x-4 no-underline">
                                        <span className="text-tinta-2 order-2 md:order-1 col-span-2 md:col-span-1">{g.genres[0] ?? "Música en vivo"}</span>
                                        <span className="font-semibold group-hover:text-acento transition-colors order-1 md:order-2">{g.groupName}</span>
                                        <span className="tabular text-right order-1 md:order-3 whitespace-nowrap">
                                            {priceLabel(g).replace("Desde ", "")}
                                            <ArrowRight className="inline size-4 ml-1.5 -mt-0.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* Busca, pide, confirma: un verbo por pantalla. */}
            <section className="mt-[var(--section-gap)]" aria-label="Cómo se contrata un grupo">
                {VERBS.map((v) => (
                    <div key={v.verb} className={`relative min-h-[100svh] overflow-hidden ${v.field}`}>
                        <PapelPicado colors={v.flags} count={10} sway className="absolute inset-x-0 top-0 w-full h-[34svh]" />
                        <h2 className="absolute inset-x-[var(--gutter)] top-1/2 -translate-y-1/2">
                            <Monument name={v.verb} />
                        </h2>
                        <p className="absolute left-[var(--gutter)] right-[var(--gutter)] bottom-10 max-w-[36ch] text-[clamp(1.0625rem,1.3vw,1.25rem)]">
                            {v.body}
                        </p>
                    </div>
                ))}
            </section>

            {/* Toda la música de una fiesta: una banda de paneles desiguales. */}
            <section className="mt-[var(--section-gap)]" aria-labelledby="musica" data-reveal>
                <h2 id="musica" className="page-frame type-heading text-[clamp(1.75rem,3vw,2.75rem)] md:pl-[calc(var(--gutter)+16.6%)]">
                    Toda la música de una fiesta
                </h2>
                <div className="mt-16 grid grid-cols-[64fr_36fr] grid-rows-2 md:flex h-[84svh] md:h-[68svh] overflow-hidden">
                    {BAND.map((b) => (
                        <Link
                            key={b.slug}
                            href={bandSlugs.has(b.slug) ? `${ROUTES.GROUPS.SEARCH}?genero=${b.slug}` : ROUTES.GROUPS.SEARCH}
                            className={`relative overflow-hidden no-underline md:basis-0 ${b.grow} md:hover:grow-[6] transition-[flex-grow] duration-500 ${b.field}`}
                        >
                            <PapelPicado colors={b.flags} count={4} sway className="absolute inset-x-0 bottom-0 w-full h-1/2" />
                            <span className="absolute left-6 top-6 right-6">
                                <span className="block type-heading text-[clamp(1.5rem,2vw,1.75rem)]">{b.name}</span>
                                <span className="block mt-1 max-w-[22ch]">{b.line}</span>
                            </span>
                        </Link>
                    ))}
                </div>
                <p className="page-frame mt-5 text-tinta-2">Toca un panel para ver los grupos de ese género.</p>
            </section>

            {/* El cierre: la idea otra vez, con los colores al revés. */}
            <section className="campo-tinta mt-[var(--section-gap)] min-h-[80svh] md:min-h-[90svh] flex flex-col justify-between" aria-labelledby="musicos">
                <h2 id="musicos" className="page-frame pt-[12svh] type-poster text-[clamp(3rem,10vw,10rem)] leading-[0.9] max-w-[11ch]">
                    Tu grupo, en cartel
                </h2>
                <div className="page-frame pb-10 grid md:grid-cols-12 gap-6 items-end" data-reveal>
                    <p className="md:col-span-5 text-[clamp(1.0625rem,1.5vw,1.25rem)] max-w-[42ch]">
                        Publica tus precios y tus fechas ocupadas. Las solicitudes te llegan con fecha, lugar y presupuesto,
                        y tú decides cuáles aceptas.
                    </p>
                    <Link
                        href={ROUTES.AUTH.SIGNUP_MUSICIAN}
                        className="md:col-start-10 md:col-span-3 inline-flex h-14 items-center justify-center gap-3 px-7 bg-acento text-fondo font-semibold no-underline hover:bg-acento-press transition-colors"
                    >
                        Publicar mi grupo
                        <ArrowRight className="size-5" aria-hidden />
                    </Link>
                </div>
            </section>
        </>
    );
}
