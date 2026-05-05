"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Loader from "@/components/ui/Loader";

/**
 * Main onboarding router - detects user type and redirects to appropriate flow
 */
export default function OnboardingPage() {
    const router = useRouter();
    const { user: authUser, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
            return;
        }

        if (!isLoading && isAuthenticated) {
            // Check session storage for signup user type
            const signupUserType = typeof window !== 'undefined'
                ? sessionStorage.getItem("nitro_signup_user_type")
                : null;

            const userType = signupUserType;

            switch (userType) {
                case "musician":
                    router.push("/onboarding/musician");
                    break;
                case "band_member":
                    router.push("/onboarding/manager");
                    break;
                case "client":
                    router.push("/dashboard/client");
                    break;
                default:
                    // Default to musician onboarding if no type is set
                    router.push("/onboarding/musician");
            }
        }
    }, [authUser, isLoading, isAuthenticated, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <Loader />
            <p className="text-muted-foreground">Configurando tu experiencia...</p>
        </div>
    );
}
