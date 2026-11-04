"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingLoading } from "@/features/onboarding/components/OnboardingParts";

/**
 * Main onboarding router - detects user type and redirects to appropriate flow
 */
export default function OnboardingPage() {
    const router = useRouter();
    const { isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
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
    }, [isLoading, isAuthenticated, router]);

    return <OnboardingLoading label="Preparando tu registro…" />;
}
