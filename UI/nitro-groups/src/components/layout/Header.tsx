"use client";

import { Logo, MobileMenu, PublicNavigation, UserMenu } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
    const { isLoading } = useAuth();

    return (
        <header className="sticky top-0 z-50 bg-telon">
            <a
                href="#contenido"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-tungsteno focus:text-telon focus:px-4 focus:py-2"
            >
                Saltar al contenido
            </a>
            <div className="page-frame h-16 flex items-center justify-between gap-6">
                <Logo />
                {isLoading ? (
                    <span className="hidden md:block h-11 w-56 bg-telon-2" aria-hidden />
                ) : (
                    <>
                        <UserMenu />
                        <PublicNavigation />
                    </>
                )}
                <MobileMenu />
            </div>
        </header>
    );
}
