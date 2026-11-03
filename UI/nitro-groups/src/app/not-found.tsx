import Link from "next/link";
import { ROUTES } from "@/config/routes";

export default function NotFound() {
    return (
        <section className="page-frame py-24 md:py-32 max-w-4xl">
            <h1 className="type-poster text-[clamp(3rem,8vw,6.5rem)]">Esta página no existe</h1>
            <p className="mt-6 text-lg text-papel max-w-[52ch]">
                Puede que el grupo haya cambiado su dirección o que el enlace esté incompleto. Búscalo por su nombre o su música.
            </p>
            <Link href={ROUTES.GROUPS.SEARCH} className="mt-10 inline-flex h-14 items-center px-7 bg-tungsteno text-telon font-semibold no-underline hover:bg-tungsteno-press transition-colors">
                Explorar grupos
            </Link>
        </section>
    );
}
