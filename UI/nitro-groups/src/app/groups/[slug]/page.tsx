import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MusicGroup } from "@/features/groups/types/MusicGroup";
import { PublicGroupProfile } from "@/features/groups/components/PublicGroupProfile";
import { serverGetResult } from "@/lib/serverApi";
import { isIsoDate } from "@/lib/format";

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ fecha?: string }>;
};

/** null solo si el grupo no existe; una caída de la API lanza (página de error, no 404). */
async function loadGroup(slug: string): Promise<MusicGroup | null> {
    const result = await serverGetResult<MusicGroup>(`/groups/slug/${encodeURIComponent(slug)}`, 60);
    if (result.ok) return result.data;
    if (result.status === 404) return null;
    throw new Error(`No se pudo cargar el grupo (estado ${result.status}).`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const group = await loadGroup((await params).slug);
    if (!group) return { title: "Grupo no encontrado" };
    const genres = (group.genres ?? []).map((g) => g.name).join(", ");
    const description = group.description || `${genres} en ${group.locationText}`;
    const image = group.coverImageUrl ?? group.profilePictureUrl;
    return {
        title: group.groupName,
        description,
        openGraph: { title: group.groupName, description, images: image ? [image] : undefined },
    };
}

export default async function GroupPublicPage({ params, searchParams }: Props) {
    const [{ slug }, { fecha }] = await Promise.all([params, searchParams]);
    const group = await loadGroup(slug);
    if (!group) notFound();

    return <PublicGroupProfile group={group} requestedDate={isIsoDate(fecha) ? fecha : undefined} />;
}
