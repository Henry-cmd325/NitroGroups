import { ROUTES } from "@/config/routes";
import { todayInMexico } from "@/lib/format";
import type { GenreOption, SearchFilters } from "../types";

interface SearchFormProps {
    genres: GenreOption[];
    values?: SearchFilters;
    /** En la página de resultados se muestra también el presupuesto. */
    showBudget?: boolean;
    submitLabel?: string;
    id?: string;
    /** "glass": la barra de la portada, un panel de vidrio con los campos dentro. */
    variant?: "plain" | "glass";
}

const plainField = "h-12 w-full rounded-lg bg-fondo-2 shadow-[inset_0_0_0_1px_var(--linea)] px-4 text-tinta placeholder:text-tinta-2/70 outline-none focus-visible:outline-2 focus-visible:outline-acento focus-visible:-outline-offset-2";
const plainLabel = "block text-sm font-medium text-tinta-2 mb-2";
const glassField = "h-10 w-full rounded-xl bg-transparent px-0 text-tinta placeholder:text-tinta-2/80 outline-none";
const glassLabel = "block text-[0.8125rem] font-medium text-tinta-2";

/**
 * Buscador de grupos. Es un formulario GET normal: funciona sin JavaScript y deja la
 * búsqueda en la URL para compartirla o volver atrás.
 */
export function SearchForm({ genres, values = {}, showBudget = false, submitLabel = "Buscar grupos", id = "buscar", variant = "plain" }: SearchFormProps) {
    const today = todayInMexico();
    const glass = variant === "glass";
    const field = glass ? glassField : plainField;
    const label = glass ? glassLabel : plainLabel;
    // En vidrio cada campo es una celda que se ilumina al pasar o enfocar.
    const cell = glass ? "rounded-xl px-5 py-2.5 transition-colors hover:bg-white/[0.04] focus-within:bg-white/[0.06]" : "";

    return (
        <form action={ROUTES.GROUPS.SEARCH} method="get" role="search" aria-label="Buscar grupos" className={glass ? "w-full vidrio rounded-xl p-2" : "w-full"}>
            <div className={`grid ${glass ? "gap-1" : "gap-x-3 gap-y-4"} ${showBudget ? "md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]" : "md:grid-cols-[1.2fr_1fr_1fr_auto]"} ${glass ? "items-center" : "items-end"}`}>
                <div className={cell}>
                    <label htmlFor={`${id}-genero`} className={label}>Música</label>
                    <select id={`${id}-genero`} name="genero" defaultValue={values.genero ?? ""} className={`${field} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23A39DAF%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_1rem_center] pr-10`}>
                        <option value="">Cualquier género</option>
                        {genres.map((g) => (
                            <option key={g.slug} value={g.slug}>{g.name}</option>
                        ))}
                    </select>
                </div>
                <div className={cell}>
                    <label htmlFor={`${id}-ciudad`} className={label}>Ciudad</label>
                    <input id={`${id}-ciudad`} name="ciudad" defaultValue={values.ciudad ?? ""} placeholder="Guadalajara" autoComplete="address-level2" className={field} />
                </div>
                <div className={cell}>
                    <label htmlFor={`${id}-fecha`} className={label}>Fecha del evento</label>
                    <input id={`${id}-fecha`} name="fecha" type="date" min={today} defaultValue={values.fecha ?? ""} className={`${field} [color-scheme:dark]`} />
                </div>
                {showBudget && (
                    <div>
                        <label htmlFor={`${id}-presupuesto`} className={label}>Presupuesto máximo</label>
                        <div className="relative">
                            <span aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-tinta-2">$</span>
                            <input id={`${id}-presupuesto`} name="presupuesto" type="number" inputMode="numeric" min={0} step={500} defaultValue={values.presupuesto ?? ""} placeholder="20000" className={`${field} pl-8 tabular`} />
                        </div>
                    </div>
                )}
                <button type="submit" className={`${glass ? "h-14 m-1" : "h-12"} px-7 bg-acento text-acento-ink rounded-lg font-[family-name:var(--font-display)] font-semibold text-sm hover:bg-acento-press active:scale-[0.98] transition-[background-color,transform] whitespace-nowrap`}>
                    {submitLabel}
                </button>
            </div>
            {values.q && <input type="hidden" name="q" value={values.q} />}
        </form>
    );
}
