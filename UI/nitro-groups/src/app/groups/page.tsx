import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { serverGet } from "@/lib/serverApi";
import { formatEventDate, formatPrice } from "@/lib/format";
import { SearchForm } from "@/features/search/components/SearchForm";
import { GroupResult } from "@/features/search/components/GroupResult";
import type { GenreOption, GroupSearchItem, PagedResult, SearchFilters } from "@/features/search/types";

const PAGE_SIZE = 12;

type Props = { searchParams: Promise<SearchFilters> };

function headline(f: SearchFilters, genreName?: string) {
    const what = genreName ?? "Grupos en vivo";
    return f.ciudad ? `${what} en ${f.ciudad}` : `${what} para tu evento`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const f = await searchParams;
    return { title: f.ciudad ? `Grupos en ${f.ciudad}` : "Explorar grupos" };
}

function toQuery(f: SearchFilters, page: number) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, pagina: String(page) })) if (v) p.set(k, v);
    return `${ROUTES.GROUPS.SEARCH}?${p.toString()}`;
}

export default async function SearchPage({ searchParams }: Props) {
    const filters = await searchParams;
    const page = Math.max(1, Number(filters.pagina) || 1);
    const budget = Number(filters.presupuesto);

    const api = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (filters.q) api.set("q", filters.q);
    if (filters.genero) api.set("genre", filters.genero);
    if (filters.ciudad) api.set("city", filters.ciudad);
    if (filters.fecha && /^\d{4}-\d{2}-\d{2}$/.test(filters.fecha)) api.set("date", filters.fecha);
    if (budget > 0) api.set("maxPrice", String(budget));

    const [genres, results] = await Promise.all([
        serverGet<GenreOption[]>("/genres", 3600),
        serverGet<PagedResult<GroupSearchItem>>(`/groups/search?${api.toString()}`, 30),
    ]);

    const genreName = genres?.find((g) => g.slug === filters.genero)?.name;
    const items = results?.items ?? [];
    const summary = [
        results ? `${results.totalCount} ${results.totalCount === 1 ? "grupo" : "grupos"}` : null,
        filters.fecha ? `libres el ${formatEventDate(filters.fecha)}` : null,
        budget > 0 ? `hasta ${formatPrice(budget)}` : null,
    ].filter(Boolean).join(", ");

    return (
        <div className="page-frame pt-10 md:pt-16 pb-[var(--section-gap)]">
            <h1 className="type-poster text-[clamp(3rem,8vw,7rem)] max-w-[16ch]">{headline(filters, genreName)}</h1>

            <div className="mt-10 md:mt-14">
                <SearchForm genres={genres ?? []} values={filters} showBudget id="resultados" submitLabel="Actualizar" />
            </div>

            {results === null ? (
                <p role="alert" className="mt-16 text-lg text-error">
                    No pudimos cargar los grupos. Revisa tu conexión y vuelve a intentarlo en un momento.
                </p>
            ) : (
                <>
                    <p className="mt-12 text-papel-2" aria-live="polite">{summary}</p>

                    {items.length === 0 ? (
                        <div className="mt-10 max-w-[60ch]">
                            <h2 className="type-heading text-3xl">Ningún grupo coincide con todo lo que pediste</h2>
                            <p className="mt-4 text-papel">
                                Prueba sin fecha o con otra ciudad: muchos grupos viajan a eventos fuera de su ciudad.
                            </p>
                            <Link href={ROUTES.GROUPS.SEARCH} className="mt-6 inline-block text-papel underline decoration-tungsteno decoration-2">
                                Ver todos los grupos
                            </Link>
                        </div>
                    ) : (
                        <ol className="mt-10 flex flex-col gap-16 md:gap-24" aria-label="Resultados">
                            {items.map((g, i) => (
                                <li key={g.id}>
                                    <GroupResult group={g} date={filters.fecha} priority={i === 0} />
                                </li>
                            ))}
                        </ol>
                    )}

                    {results.totalPages > 1 && (
                        <nav aria-label="Páginas de resultados" className="mt-20 flex items-center justify-between gap-6 text-lg">
                            {results.hasPreviousPage ? (
                                <Link href={toQuery(filters, page - 1)} className="text-papel underline decoration-tungsteno decoration-2">Anteriores</Link>
                            ) : <span />}
                            <span className="text-papel-2 tabular">Página {page} de {results.totalPages}</span>
                            {results.hasNextPage ? (
                                <Link href={toQuery(filters, page + 1)} className="text-papel underline decoration-tungsteno decoration-2">Siguientes</Link>
                            ) : <span />}
                        </nav>
                    )}
                </>
            )}
        </div>
    );
}
