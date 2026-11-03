"use client";

import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LogoutButton } from "@/components/auth";
import { UserTypeEnum } from "@/features/groups/types/User";
import { ROUTES } from "@/config/routes";
import { dashboardFor } from "./navigation";

export function UserMenu() {
    const { user, auth0User, isLoading } = useCurrentUser();

    if (isLoading || !auth0User) return null;

    const dashboard = dashboardFor(user?.userType === UserTypeEnum.Musician);
    const displayName = user?.firstName || auth0User.name || auth0User.nickname || auth0User.email;
    const picture = user?.profilePictureUrl || auth0User.picture;

    return (
        <div className="hidden md:flex items-center gap-7">
            <nav aria-label="Principal" className="flex items-center gap-7">
                <Link href={ROUTES.GROUPS.SEARCH} className="text-papel-2 no-underline hover:text-papel transition-colors">
                    Explorar grupos
                </Link>
                <Link href={dashboard.href} className="text-papel no-underline font-semibold hover:text-tungsteno transition-colors">
                    {dashboard.label}
                </Link>
            </nav>
            <div className="flex items-center gap-3">
                {picture ? (
                    // eslint-disable-next-line @next/next/no-img-element -- avatar de Auth0/R2 con dominio variable
                    <img src={picture} alt="" className="size-9 rounded-full object-cover" />
                ) : (
                    <span aria-hidden className="size-9 rounded-full bg-telon-3 grid place-items-center font-semibold">
                        {displayName?.charAt(0).toUpperCase()}
                    </span>
                )}
                <span className="text-papel-2 text-sm">{displayName}</span>
            </div>
            <LogoutButton />
        </div>
    );
}
