import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { serverGet } from "@/lib/serverApi";
import { priceLabel } from "@/lib/format";
import { Photo } from "@/components/ui/Photo";
import { SearchForm } from "@/features/search/components/SearchForm";
import type { GenreOption, GroupSearchItem, PagedResult } from "@/features/search/types";

const STEPS = [
    {
        title: "Busca por fecha",
        body: "Elige la música, la ciudad y el día del evento. Solo ves grupos que tienen esa fecha libre.",
    },
    {
        title: "Envía tu solicitud",
        body: "Cuéntale al grupo qué celebras, cuántas horas necesitas y tu presupuesto. Sin llamadas de ida y vuelta.",
    },
    {
        title: "Confirma con el grupo",
        body: "El grupo acepta o te propone otra opción. Todo queda por escrito en la misma conversación.",
    },
];

function Headliner({ group, size }: { group: GroupSearchItem; size: "lead" | "support" }) {
    const lead = size === "lead";
    return (
        <article className="relative">
            <Photo
                src={group.imageUrl}
                alt={`${group.groupName} en vivo`}
                fallbackTitle={group.groupName}
                priority={lead}
                className={lead ? "aspect-[16/10] w-full" : "aspect-[4/3] w-full"}
            />
            <h3 className={`type-poster mt-5 ${lead ? "text-[clamp(2.75rem,6vw,5.5rem)]" : "text-[clamp(2rem,3.4vw,3rem)]"}`}>
                <Link
                    href={ROUTES.GROUPS.PUBLIC_PROFILE(group.slug)}
                    className="no-underline after:absolute after:inset-0 hover:text-tungsteno transition-colors"
                >
                    {group.groupName}
                </Link>
            </h3>
            <p className="mt-2 text-papel-2">{[group.genres[0], group.locationText].filter(Boolean).join(" en ")}</p>
            <p className="mt-1 text-papel font-semibold tabular">{priceLabel(group)}</p>
        </article>
    );
}

export default async function Home() {
    const [genres, featured] = await Promise.all([
        serverGet<GenreOption[]>("/genres", 3600),
        serverGet<PagedResult<GroupSearchItem>>("/groups/search?size=3", 120),
    ]);
    const groups = featured?.items ?? [];
    const [lead, ...support] = groups;

    return (
        <>
            {/* Cartel: lo que la página anuncia y la acción que importa. */}
            <section className="page-frame pt-12 md:pt-20" aria-labelledby="titulo">
                <h1 id="titulo" className="type-poster poster-tighten text-[clamp(4rem,17.5vw,17rem)]">
                    Música en vivo para tu evento
                </h1>
                <p className="mt-8 md:mt-10 max-w-[44ch] text-[clamp(1.15rem,1.6vw,1.5rem)] leading-snug text-papel">
                    Encuentra el grupo para tu boda, tus XV años o la fiesta de la empresa: escucha su música,
                    revisa sus fechas libres y su precio.
                </p>
                <div className="mt-10 md:mt-14 max-w-6xl">
                    <SearchForm genres={genres ?? []} id="portada" />
                </div>
            </section>

            {lead && (
                <section className="page-frame mt-[var(--section-gap)]" aria-labelledby="grupos">
                    <div className="grid md:grid-cols-12 gap-x-8 gap-y-6 items-end">
                        <h2 id="grupos" className="type-heading text-[clamp(2rem,4vw,3.5rem)] md:col-span-7">
                            Grupos listos para tu fecha
                        </h2>
                        <Link
                            href={ROUTES.GROUPS.SEARCH}
                            className="md:col-span-5 md:justify-self-end text-papel underline decoration-tungsteno decoration-2 underline-offset-4"
                        >
                            Ver todos los grupos
                        </Link>
                    </div>
                    <div className="mt-10 grid md:grid-cols-12 gap-x-8 gap-y-14">
                        <div className="md:col-span-8">
                            <Headliner group={lead} size="lead" />
                        </div>
                        {support.length > 0 && (
                            <div className="md:col-span-4 flex flex-col gap-14 md:pt-24">
                                {support.map((g) => (
                                    <Headliner key={g.id} group={g} size="support" />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section className="page-frame mt-[var(--section-gap)] grid md:grid-cols-12 gap-x-8 gap-y-12" aria-labelledby="como">
                <h2 id="como" className="type-poster text-[clamp(2.75rem,6vw,5.5rem)] md:col-span-5">
                    Contratar un grupo, por escrito y sin vueltas
                </h2>
                <ol className="md:col-span-6 md:col-start-7 flex flex-col gap-10 md:pt-3">
                    {STEPS.map((step) => (
                        <li key={step.title}>
                            <h3 className="type-heading text-[1.75rem]">{step.title}</h3>
                            <p className="mt-2 text-papel max-w-[48ch]">{step.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* El único cambio de campo de la página: la luz del escenario. */}
            <section className="mt-[var(--section-gap)] bg-tungsteno text-telon" aria-labelledby="musicos">
                <div className="page-frame py-[clamp(4.5rem,10vw,9rem)] grid md:grid-cols-12 gap-x-8 gap-y-10">
                    <h2 id="musicos" className="type-poster text-[clamp(3rem,8vw,7.5rem)] md:col-span-7">
                        Tu grupo, con la agenda llena
                    </h2>
                    <div className="md:col-span-5 flex flex-col justify-end gap-6">
                        <p className="text-lg leading-relaxed max-w-[42ch]">
                            Publica fotos, video y precios, marca las fechas que ya tienes ocupadas y recibe
                            solicitudes con fecha, horario y presupuesto. Tú decides cuáles aceptas.
                        </p>
                        <Link
                            href={ROUTES.AUTH.SIGNUP_MUSICIAN}
                            className="self-start inline-flex h-14 items-center px-7 bg-telon text-papel font-semibold no-underline hover:bg-telon-2 transition-colors"
                        >
                            Publicar mi grupo
                        </Link>
                    </div>
                </div>
            </section>

            {genres && genres.length > 0 && (
                <section className="page-frame mt-[var(--section-gap)]" aria-labelledby="generos">
                    <h2 id="generos" className="type-heading text-[clamp(1.5rem,2.4vw,2rem)] text-papel-2">
                        Busca por género
                    </h2>
                    <ul className="mt-8 flex flex-wrap gap-x-[0.45em] gap-y-1 type-poster text-[clamp(2.25rem,5.5vw,5rem)] leading-[1.02]">
                        {genres.map((g, i) => (
                            <li key={g.slug}>
                                <Link
                                    href={`${ROUTES.GROUPS.SEARCH}?genero=${g.slug}`}
                                    className="no-underline text-papel hover:text-tungsteno transition-colors"
                                >
                                    {g.name}
                                </Link>
                                {i < genres.length - 1 && <span aria-hidden className="ml-[0.3em] text-papel-2/35 font-normal">/</span>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}
