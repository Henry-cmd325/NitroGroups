import Link from "next/link";
import { ROUTES } from "@/config/routes";

/** Wordmark tipográfico, sin ícono: el nombre con un punto lila. */
export function Logo({ className = "" }: { className?: string }) {
    return (
        <Link
            href={ROUTES.HOME}
            className={`type-heading text-[1.1875rem] leading-none text-tinta no-underline tracking-[-0.03em] ${className}`}
            aria-label="NitroGroups, inicio"
        >
            NitroGroups<span className="text-acento">.</span>
        </Link>
    );
}
