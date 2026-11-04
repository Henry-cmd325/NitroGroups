import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestThread } from "@/features/bookings/components/RequestThread";

export const metadata: Metadata = { title: "Solicitud" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ como?: string }> };

export default async function RequestPage({ params, searchParams }: Props) {
    const [{ id }, { como }] = await Promise.all([params, searchParams]);
    const requestId = Number(id);
    if (!Number.isInteger(requestId) || requestId <= 0) notFound();

    return (
        <div className="page-frame pt-12 md:pt-16">
            <RequestThread requestId={requestId} viewer={como === "grupo" ? "Group" : "Client"} />
        </div>
    );
}
