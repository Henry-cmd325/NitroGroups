import Link from "next/link";
import { ROUTES } from "@/config/routes";

/** Wordmark tipográfico: la marca es la letra de cartel, sin ícono. */
export function Logo({ className = "" }: { className?: string }) {
    return (
        <Link
            href={ROUTES.HOME}
            className={`type-poster text-[1.75rem] leading-none text-papel no-underline ${className}`}
            aria-label="NitroGroups, inicio"
        >
            NitroGroups
        </Link>
    );
}
