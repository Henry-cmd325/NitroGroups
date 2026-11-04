import Link from "next/link";
import { formatEventDate, formatPrice } from "@/lib/format";
import { statusLabel } from "../status";
import type { EventRequest, EventRequestParty } from "../types";

/**
 * Lista de solicitudes. El cliente ve el grupo; el grupo ve al cliente. El estado pendiente
 * para el grupo va en acento: es lo único que espera una acción.
 */
export function RequestList({ requests, viewer }: { requests: EventRequest[]; viewer: EventRequestParty }) {
    return (
        <ul className="flex flex-col">
            {requests.map((r) => {
                const needsAction = viewer === "Group" && r.status === "Pending";
                const who = viewer === "Client" ? r.groupName : r.clientName;
                return (
                    <li key={r.id} className="relative py-6 grid md:grid-cols-12 gap-x-6 gap-y-1 items-baseline [&+&]:shadow-[inset_0_1px_0_var(--fondo-3)]">
                        <p className="md:col-span-3 type-heading text-xl tabular first-letter:uppercase">{formatEventDate(r.eventDate)}</p>
                        <div className="md:col-span-5">
                            <Link href={`/solicitudes/${r.id}${viewer === "Group" ? "?como=grupo" : ""}`} className="no-underline text-tinta font-semibold hover:text-acento after:absolute after:inset-0">
                                {who}
                            </Link>
                            <p className="text-tinta-2">
                                {r.eventType} en {r.locationText}
                                {viewer === "Group" && r.isSelfBooked && <span className="block text-sm">Cargada por el grupo</span>}
                            </p>
                        </div>
                        <p className="md:col-span-2 text-tinta-2 tabular">{r.budget ? formatPrice(r.budget, r.currency) : `${r.durationHours} h`}</p>
                        <p className={`md:col-span-2 md:text-right text-sm ${needsAction ? "text-acento font-semibold" : "text-tinta-2"}`}>
                            {statusLabel(r.status, viewer)}
                        </p>
                    </li>
                );
            })}
        </ul>
    );
}
