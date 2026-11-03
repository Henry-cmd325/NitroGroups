"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { Monument } from "@/features/cartel/Monument";
import LogoutButton from "@/components/auth/LogoutButton";

/** Cierre de página: el nombre vuelve de margen a margen, con los colores del cartel al revés. */
export default function Footer() {
    const { isAuthenticated } = useAuth();
    const pathname = usePathname();
    // En las pantallas de trabajo el pie es una línea: ahí se viene a trabajar, no a leer el cartel.
    const working = ["/dashboard", "/solicitudes", "/onboarding"].some((p) => pathname?.startsWith(p));
    const year = new Date().getFullYear();
    const link = "no-underline text-tinta-2 hover:text-tinta transition-colors";
    if (working) {
        return (
            <footer className="hoja-clara bg-fondo-2 text-tinta-2">
                <div className="page-frame py-6 flex flex-wrap items-center justify-between gap-4 text-[0.9375rem]">
                    <p>© {year} NitroGroups</p>
                    <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
                        <Link href={ROUTES.GROUPS.SEARCH} className={link}>Explorar grupos</Link>
                        <Link href={ROUTES.DASHBOARD.ROOT} className={link}>Mi panel</Link>
                    </nav>
                </div>
            </footer>
        );
    }

    return (
        <footer className="campo-tinta">
            <div className="page-frame pt-12 pb-6 flex flex-col gap-16">
                <div className="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-8 text-[0.9375rem]">
                    <div className="md:col-span-3">
                        <p className="font-semibold text-tinta">Para quien contrata</p>
                        <ul className="mt-2 space-y-1">
                            <li><Link href={ROUTES.GROUPS.SEARCH} className={link}>Explorar grupos</Link></li>
                            {isAuthenticated && <li><Link href={ROUTES.DASHBOARD.ROOT} className={link}>Mis solicitudes</Link></li>}
                        </ul>
                    </div>
                    <div className="md:col-span-3">
                        <p className="font-semibold text-tinta">Para grupos</p>
                        <ul className="mt-2 space-y-1">
                            <li><Link href={ROUTES.AUTH.SIGNUP_MUSICIAN} className={link}>Publicar mi grupo</Link></li>
                            {isAuthenticated && <li><Link href={ROUTES.DASHBOARD.ROOT} className={link}>Mi panel</Link></li>}
                        </ul>
                    </div>
                    <div className="md:col-span-3">
                        <p className="font-semibold text-tinta">Tu cuenta</p>
                        <ul className="mt-2 space-y-1">
                            {isAuthenticated ? (
                                <li><LogoutButton /></li>
                            ) : (
                                <>
                                    <li><Link href={ROUTES.AUTH.LOGIN} className={link}>Entrar</Link></li>
                                    <li><Link href={ROUTES.AUTH.SIGNUP} className={link}>Crear cuenta</Link></li>
                                </>
                            )}
                        </ul>
                    </div>
                    <div className="md:col-span-3">
                        <p className="font-semibold text-tinta">Dónde tocamos</p>
                        <p className="mt-2 text-tinta-2">Grupos de todo México, con fechas en hora del centro del país.</p>
                    </div>
                </div>
                <div>
                    <Monument name="NitroGroups" className="text-tinta" />
                    <p className="mt-5 text-[0.8125rem] text-tinta-2">© {year} NitroGroups. Música en vivo para eventos en México.</p>
                </div>
            </div>
        </footer>
    );
}
