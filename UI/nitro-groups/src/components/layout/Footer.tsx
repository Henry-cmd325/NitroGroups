import Link from "next/link";
import { ROUTES } from "@/config/routes";

/** Cierre de página: el nombre vuelve a todo lo ancho, como el pie de un cartel. */
export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="mt-[var(--section-gap)] bg-telon-2">
            <div className="page-frame pt-16 pb-10">
                <nav aria-label="Pie de página" className="flex flex-wrap gap-x-10 gap-y-3 text-papel-2">
                    <Link href={ROUTES.GROUPS.SEARCH} className="no-underline hover:text-papel">Explorar grupos</Link>
                    <Link href={`${ROUTES.AUTH.SIGNUP}?tipo=musico`} className="no-underline hover:text-papel">Publicar mi grupo</Link>
                    <Link href={ROUTES.AUTH.LOGIN} className="no-underline hover:text-papel">Entrar</Link>
                </nav>
                <p aria-hidden className="type-poster mt-16 text-[min(24vw,22rem)] leading-[0.8] -ml-[0.03em] text-telon-3 select-none whitespace-nowrap overflow-hidden">
                    NitroGroups
                </p>
                <p className="mt-6 text-sm text-papel-2">© {year} NitroGroups. Música en vivo para eventos en México.</p>
            </div>
        </footer>
    );
}
