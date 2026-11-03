import { ROUTES } from "@/config/routes";

/** Enlaces públicos de la barra. Pocos y planos (DESIGN.md → Navigation). */
export const PUBLIC_LINKS = [
    { href: ROUTES.GROUPS.SEARCH, label: "Explorar grupos" },
    { href: ROUTES.AUTH.SIGNUP_MUSICIAN, label: "Publicar mi grupo" },
] as const;

export function dashboardFor(isMusician: boolean) {
    return isMusician
        ? { href: ROUTES.DASHBOARD.MUSICIAN, label: "Mi grupo" }
        : { href: ROUTES.DASHBOARD.CLIENT, label: "Mis solicitudes" };
}
