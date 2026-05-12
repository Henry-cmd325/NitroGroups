"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { LogoutButton } from "@/components/auth";
import { UserTypeEnum } from "@/features/groups/types/User";

export function MobileMenu() {
    const { user, auth0User, isLoading } = useCurrentUser();
    const [isOpen, setIsOpen] = useState(false);

    const toggle = () => setIsOpen(!isOpen);

    if (isLoading) return null;

    // Determine dashboard link and label based on user type
    const isMusician = user?.userType === UserTypeEnum.Musician;
    const dashboardLink = isMusician ? "/dashboard/musician" : "/dashboard/client";
    const dashboardLabel = isMusician ? "Panel de Artista" : "Mis Solicitudes";

    // Use DB user data if available, fallback to Auth0 data
    const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim()
        : auth0User?.name ?? auth0User?.nickname ?? auth0User?.email;

    return (
        <>
            <button className="md:hidden p-2" onClick={toggle} aria-label="Toggle menu">
                {isOpen ? <span className="text-2xl">✕</span> : <span className="text-2xl">☰</span>}
            </button>

            {isOpen && (
                <div className="absolute top-16 left-0 right-0 border-t bg-background/95 backdrop-blur-md p-4 md:hidden shadow-lg animate-in slide-in-from-top-2">
                    {auth0User ? (
                        <div className="flex flex-col space-y-4">
                            <Link
                                href={dashboardLink}
                                className="text-lg font-medium hover:text-primary transition-colors"
                                onClick={toggle}
                            >
                                {dashboardLabel}
                            </Link>
                            <span className="text-muted-foreground text-sm">
                                Hola, {displayName}
                            </span>
                            <LogoutButton />
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-4">
                            {/* Mobile Navigation Links */}
                            <Link
                                href="#artistas"
                                className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded hover:bg-accent"
                                onClick={toggle}
                            >
                                Artistas
                            </Link>
                            {/* ... more links */}

                            <div className="pt-4 flex flex-col gap-2 border-t">
                                <Button variant="outline" asChild className="w-full justify-center">
                                    <Link href={ROUTES.AUTH.LOGIN} onClick={toggle}>Iniciar Sesión</Link>
                                </Button>
                                <Button asChild className="w-full justify-center">
                                    <Link href={ROUTES.AUTH.SIGNUP} onClick={toggle}>Registrarse</Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

