"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LogoutButton } from "@/components/auth";
import { UserTypeEnum } from "@/features/groups/types/User";
import Link from "next/link";

export function UserMenu() {
    const { user, auth0User, isLoading } = useCurrentUser();

    if (isLoading || !auth0User) return null;

    // Determine dashboard link and label based on user type
    const isMusician = user?.userType === UserTypeEnum.Musician;
    const dashboardLink = isMusician ? "/dashboard/musician" : "/dashboard/client";
    const dashboardLabel = isMusician ? "Panel de Artista" : "Mis Solicitudes";

    // Use DB user data if available, fallback to Auth0 data
    const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim()
        : auth0User.name ?? auth0User.nickname ?? auth0User.email;

    const profilePicture = user?.profilePictureUrl || auth0User.picture;

    return (
        <div className="hidden md:flex items-center space-x-6">
            <Link href={dashboardLink} className="hover:text-primary transition-colors font-medium">
                {dashboardLabel}
            </Link>
            <div className="flex items-center space-x-3">
                {profilePicture && (
                    <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                    />
                )}
                <span className="text-muted-foreground">
                    Hola, {displayName}
                </span>
            </div>
            <LogoutButton />
        </div>
    );
}

