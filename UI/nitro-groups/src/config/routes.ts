export const ROUTES = {
    HOME: "/",
    AUTH: {
        LOGIN: "/login",
        LOGOUT: "/auth/logout",
        SIGNUP: "/signup",
        ONBOARDING: "/onboarding",
    },
    DASHBOARD: {
        ROOT: "/dashboard",
        MUSICIAN: "/dashboard/musician",
        CLIENT: "/dashboard/client",
    },
    GROUPS: {
        PUBLIC_PROFILE: (slug: string) => `/groups/${slug}`,
    },
} as const;
