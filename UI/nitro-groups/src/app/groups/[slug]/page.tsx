import type { MusicGroup } from "@/features/groups/types/MusicGroup";
import GroupProfile from "@/features/groups/components/GroupProfile";
import { normalizeBackendApiBaseUrl } from "@/lib/backendBaseUrl";
import { notFound } from "next/navigation";

type GroupPublicPageProps = {
    params: Promise<{ slug: string }>;
};

export default async function GroupPublicPage({ params }: GroupPublicPageProps) {
    const { slug } = await params;

    if (!slug) {
        notFound();
    }

    const apiRoot = normalizeBackendApiBaseUrl(
        process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_API_URL
    );
    const response = await fetch(
        `${apiRoot}/groups/slug/${encodeURIComponent(slug)}`,
        { cache: "no-store" },
    );

    if (!response.ok) {
        notFound();
    }

    const group = (await response.json()) as MusicGroup;

    return <GroupProfile mode="public" slug={slug} initialGroup={group} />;
}
