"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";

export function PublicNavigation() {
    const { isLoading, isAuthenticated } = useAuth();

    // Don't show login/register buttons while loading or when authenticated
    if (isLoading || isAuthenticated) return null;

    return (
        <>
            <nav className="hidden md:flex items-center space-x-6 h-full">
                {/* Navigation links can be added here */}
            </nav>
            <div className="hidden md:flex items-center space-x-3">
                <Button variant="ghost" asChild>
                    <Link href={ROUTES.AUTH.LOGIN}>Iniciar Sesión</Link>
                </Button>
                <Button asChild>
                    <Link href={ROUTES.AUTH.SIGNUP}>Registrarse</Link>
                </Button>
            </div>
        </>
    );
}
