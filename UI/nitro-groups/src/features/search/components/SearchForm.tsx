import { ROUTES } from "@/config/routes";
import type { GenreOption, SearchFilters } from "../types";

interface SearchFormProps {
    genres: GenreOption[];
    values?: SearchFilters;
    /** En la página de resultados se muestra también el presupuesto. */
    showBudget?: boolean;
    submitLabel?: string;
    id?: string;
}

const field = "h-14 w-full bg-telon-2 px-4 text-papel placeholder:text-papel-2/70 outline-none focus-visible:outline-2 focus-visible:outline-tungsteno focus-visible:-outline-offset-2";
const label = "block text-sm font-medium text-papel-2 mb-2";

/**
 * Buscador de grupos. Es un formulario GET normal: funciona sin JavaScript y deja la
 * búsqueda en la URL para compartirla o volver atrás.
 */
export function SearchForm({ genres, values = {}, showBudget = false, submitLabel = "Buscar grupos", id = "buscar" }: SearchFormProps) {
    const today = new Date().toISOString().slice(0, 10);

    return (
        <form action={ROUTES.GROUPS.SEARCH} method="get" role="search" aria-label="Buscar grupos" className="w-full">
            <div className={`grid gap-x-3 gap-y-4 ${showBudget ? "md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]" : "md:grid-cols-[1.2fr_1fr_1fr_auto]"} items-end`}>
                <div>
                    <label htmlFor={`${id}-genero`} className={label}>Música</label>
                    <select id={`${id}-genero`} name="genero" defaultValue={values.genero ?? ""} className={`${field} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23D9C7B8%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_1rem_center] pr-10`}>
                        <option value="">Cualquier género</option>
                        {genres.map((g) => (
                            <option key={g.slug} value={g.slug}>{g.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor={`${id}-ciudad`} className={label}>Ciudad</label>
                    <input id={`${id}-ciudad`} name="ciudad" defaultValue={values.ciudad ?? ""} placeholder="Guadalajara" autoComplete="address-level2" className={field} />
                </div>
                <div>
                    <label htmlFor={`${id}-fecha`} className={label}>Fecha del evento</label>
                    <input id={`${id}-fecha`} name="fecha" type="date" min={today} defaultValue={values.fecha ?? ""} className={`${field} [color-scheme:dark]`} />
                </div>
                {showBudget && (
                    <div>
                        <label htmlFor={`${id}-presupuesto`} className={label}>Presupuesto máximo</label>
                        <div className="relative">
                            <span aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-papel-2">$</span>
                            <input id={`${id}-presupuesto`} name="presupuesto" type="number" inputMode="numeric" min={0} step={500} defaultValue={values.presupuesto ?? ""} placeholder="20000" className={`${field} pl-8 tabular`} />
                        </div>
                    </div>
                )}
                <button type="submit" className="h-14 px-7 bg-tungsteno text-telon font-semibold hover:bg-tungsteno-press transition-colors whitespace-nowrap">
                    {submitLabel}
                </button>
            </div>
            {values.q && <input type="hidden" name="q" value={values.q} />}
        </form>
    );
}
