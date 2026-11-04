"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Entradas de sección: los hijos de cada [data-reveal] suben y aparecen en orden cuando la sección
 * entra en pantalla. Solo se ocultan si este script corre (clase "js" en <html>), así el contenido
 * nunca queda escondido si el script falla. Con movimiento reducido no hay recorrido.
 */
export default function Reveal() {
    const pathname = usePathname();

    useEffect(() => {
        const root = document.documentElement;
        root.classList.add("js");
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add("is-in");
                        io.unobserve(e.target);
                    }
                }
            },
            { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
        );
        document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
            Array.from(el.children).forEach((child, i) => (child as HTMLElement).style.setProperty("--i", String(i)));
            io.observe(el);
        });
        return () => io.disconnect();
    }, [pathname]);

    return null;
}
