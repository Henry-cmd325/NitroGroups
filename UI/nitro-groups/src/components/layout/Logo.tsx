import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/config/routes";

export function Logo() {
    return (
        <Link href={ROUTES.HOME} className="flex items-center space-x-2">
            <Image
                src="/img/Logo.png"
                alt="NitroGroups Logo"
                width={30}
                height={30}
                style={{ marginTop: "5px" }}
                priority // Logo should load fast
            />
            <span className="text-xl font-semibold">NitroGroups</span>
        </Link>
    );
}
