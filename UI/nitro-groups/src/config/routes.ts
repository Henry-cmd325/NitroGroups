export const ROUTES = {
    HOME: "/",
    AUTH: {
        LOGIN: "/login",
        LOGOUT: "/auth/logout",
        SIGNUP: "/signup",
        SIGNUP_MUSICIAN: "/signup?tipo=musico",
        ONBOARDING: "/onboarding",
    },
    DASHBOARD: {
        ROOT: "/dashboard",
        MUSICIAN: "/dashboard/musician",
        CLIENT: "/dashboard/client",
    },
    GROUPS: {
        SEARCH: "/groups",
        PUBLIC_PROFILE: (slug: string) => `/groups/${slug}`,
    },
} as const;
