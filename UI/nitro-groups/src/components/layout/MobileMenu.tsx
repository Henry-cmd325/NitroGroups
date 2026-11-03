"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { LogoutButton } from "@/components/auth";
import { UserTypeEnum } from "@/features/groups/types/User";
import { PUBLIC_LINKS, dashboardFor } from "./navigation";

export function MobileMenu() {
    const { user, auth0User, isLoading } = useCurrentUser();
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // Cerrar al navegar y con Escape.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setOpen(false);
    }

    if (isLoading) return null;

    const dashboard = dashboardFor(user?.userType === UserTypeEnum.Musician);
    const linkClass = "block py-3 text-2xl type-heading text-papel no-underline";

    return (
        <div className="md:hidden">
            <button
                type="button"
                className="size-11 grid place-items-center -mr-2"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="menu-movil"
                aria-label={open ? "Cerrar menú" : "Abrir menú"}
            >
                {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>

            {open && (
                <div id="menu-movil" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }} className="fixed inset-x-0 top-16 bottom-0 z-40 bg-telon px-[var(--gutter)] py-6 overflow-y-auto">
                    <nav aria-label="Principal">
                        <Link href={ROUTES.GROUPS.SEARCH} className={linkClass}>Explorar grupos</Link>
                        {auth0User ? (
                            <Link href={dashboard.href} className={linkClass}>{dashboard.label}</Link>
                        ) : (
                            PUBLIC_LINKS.filter((l) => l.href !== ROUTES.GROUPS.SEARCH).map((l) => (
                                <Link key={l.href} href={l.href} className={linkClass}>{l.label}</Link>
                            ))
                        )}
                    </nav>
                    <div className="mt-8 flex flex-col gap-3">
                        {auth0User ? (
                            <LogoutButton />
                        ) : (
                            <>
                                <Button asChild size="lg"><Link href={ROUTES.AUTH.SIGNUP}>Crear cuenta</Link></Button>
                                <Button asChild size="lg" variant="secondary"><Link href={ROUTES.AUTH.LOGIN}>Entrar</Link></Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
