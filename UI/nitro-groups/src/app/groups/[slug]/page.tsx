import type { MusicGroup } from "@/types/MusicGroup";
import GroupProfile from "@/components/groups/GroupProfile";
import { notFound } from "next/navigation";

type GroupPublicPageProps = {
    params: Promise<{ slug: string }>;
};

export default async function GroupPublicPage({ params }: GroupPublicPageProps) {
    const { slug } = await params;

    if (!slug) {
        notFound();
    }

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/groups/slug/${encodeURIComponent(slug)}`,
        { cache: "no-store" },
    );

    if (!response.ok) {
        notFound();
    }

    const group = (await response.json()) as MusicGroup;

    return <GroupProfile mode="public" slug={slug} initialGroup={group} />;
}
