"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { PUBLIC_LINKS } from "./navigation";

export function PublicNavigation() {
    const { isLoading, isAuthenticated } = useAuth();

    if (isLoading || isAuthenticated) return null;

    return (
        <div className="hidden md:flex items-center gap-8">
            <nav aria-label="Principal" className="flex items-center gap-7">
                {PUBLIC_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="text-tinta-2 no-underline hover:text-tinta transition-colors">
                        {link.label}
                    </Link>
                ))}
                <Link href={ROUTES.AUTH.LOGIN} className="text-tinta-2 no-underline hover:text-tinta transition-colors">
                    Entrar
                </Link>
            </nav>
            <Button asChild>
                <Link href={ROUTES.AUTH.SIGNUP}>Crear cuenta</Link>
            </Button>
        </div>
    );
}
