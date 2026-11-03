"use client";

import Link from "next/link";
import { ROUTES } from "@/config/routes";

/** Error inesperado (por ejemplo, la API no responde). Dice qué pasó y cómo seguir. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <section className="page-frame py-24 md:py-32 max-w-4xl">
            <h1 className="type-poster text-[clamp(3rem,8vw,6.5rem)]">No pudimos cargar esta página</h1>
            <p className="mt-6 text-lg text-tinta max-w-[52ch]">
                El servicio no respondió a tiempo. Vuelve a intentarlo en un momento; si sigue fallando, busca el grupo desde el inicio.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
                <button type="button" onClick={reset} className="h-14 px-7 bg-acento text-fondo font-semibold hover:bg-acento-press transition-colors">
                    Reintentar
                </button>
                <Link href={ROUTES.GROUPS.SEARCH} className="inline-flex h-14 items-center px-7 bg-fondo-2 text-tinta font-semibold no-underline hover:bg-fondo-3 transition-colors">
                    Explorar grupos
                </Link>
            </div>
        </section>
    );
}
