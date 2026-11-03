"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "@/config/routes";
import { formatEventDate, formatPrice } from "@/lib/format";
import { apiErrorMessage, bookingsService } from "../bookings.service";
import { availableActions, shortTime, statusLabel } from "../status";
import type { EventRequest, EventRequestParty } from "../types";

const timeFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
        <div>
            <dt className="text-sm text-tinta-2">{label}</dt>
            <dd className="mt-1 text-lg tabular">{value}</dd>
        </div>
    );
}

/**
 * Una solicitud y su conversación. La parte que mira se deduce de la API: si el usuario
 * administra el grupo, es "Group"; si no, es el cliente (la API ya negó a cualquier otro).
 */
export function RequestThread({ requestId, viewer }: { requestId: number; viewer: EventRequestParty }) {
    const queryClient = useQueryClient();
    const [reply, setReply] = useState("");
    const query = useQuery({ queryKey: ["event-request", requestId], queryFn: () => bookingsService.get(requestId) });
    const refresh = (data?: EventRequest) => {
        if (data) queryClient.setQueryData(["event-request", requestId], (old: EventRequest | undefined) => ({ ...old, ...data, messages: data.messages ?? old?.messages }));
        void queryClient.invalidateQueries({ queryKey: ["event-request", requestId] });
    };

    const accept = useMutation({ mutationFn: () => bookingsService.accept(requestId), onSuccess: refresh });
    const decline = useMutation({ mutationFn: () => bookingsService.decline(requestId), onSuccess: refresh });
    const cancel = useMutation({ mutationFn: () => bookingsService.cancel(requestId), onSuccess: refresh });
    const send = useMutation({
        mutationFn: () => bookingsService.postMessage(requestId, reply.trim()),
        onSuccess: () => { setReply(""); refresh(); },
    });

    if (query.isPending) return <p className="text-tinta-2" aria-busy>Cargando la solicitud…</p>;
    if (query.isError) {
        return (
            <div role="alert">
                <p className="type-heading text-2xl">No encontramos esta solicitud</p>
                <p className="mt-2 text-tinta">Puede que el enlace sea de otra cuenta. Revisa tus solicitudes desde tu panel.</p>
            </div>
        );
    }

    const r = query.data;
    const actions = availableActions(r, viewer);
    const failed = [accept, decline, cancel, send].find((m) => m.isError);
    const busy = [accept, decline, cancel, send].some((m) => m.isPending);
    const title = viewer === "Client" ? r.groupName : r.clientName;

    return (
        <article className="grid md:grid-cols-12 gap-x-8 gap-y-12">
            <header className="md:col-span-12">
                <p className={`text-sm ${actions.accept ? "text-acento font-semibold" : "text-tinta-2"}`}>{statusLabel(r.status, viewer)}</p>
                <h1 className="mt-2 type-heading text-[clamp(2rem,3.4vw,3rem)]">
                    {viewer === "Client" ? (
                        <Link href={ROUTES.GROUPS.PUBLIC_PROFILE(r.groupSlug)} className="no-underline hover:text-acento">{title}</Link>
                    ) : title}
                </h1>
                <p className="mt-3 text-xl text-tinta first-letter:uppercase">{formatEventDate(r.eventDate)}</p>
                {viewer === "Group" && r.isSelfBooked && (
                    <p className="mt-2 text-sm text-tinta-2">Cargada por el grupo: no cuenta en las reservas públicas.</p>
                )}
            </header>

            <dl className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-6 content-start">
                <Detail label="Evento" value={r.eventType} />
                <Detail label="Lugar" value={r.locationText} />
                <Detail label="Hora de inicio" value={shortTime(r.startTime)} />
                <Detail label="Duración" value={`${r.durationHours} ${r.durationHours === 1 ? "hora" : "horas"}`} />
                <Detail label="Invitados" value={r.guestCount ? String(r.guestCount) : null} />
                <Detail label="Presupuesto" value={formatPrice(r.budget, r.currency)} />
            </dl>

            <section className="md:col-span-8 flex flex-col gap-8" aria-label="Conversación">
                <ol className="flex flex-col gap-6">
                    <li className="bg-fondo-2 p-5">
                        <p className="text-sm text-tinta-2 flex flex-wrap gap-x-3"><span>{r.clientName}</span><span className="tabular">{timeFmt.format(new Date(r.createdAt))}</span></p>
                        <p className="mt-2 whitespace-pre-line leading-relaxed">{r.message}</p>
                    </li>
                    {r.responseMessage && (
                        <li className="bg-fondo-3 p-5 md:ml-12">
                            <p className="text-sm text-tinta-2">{r.groupName}</p>
                            <p className="mt-2 whitespace-pre-line leading-relaxed">{r.responseMessage}</p>
                        </li>
                    )}
                    {(r.messages ?? []).map((m) => (
                        <li key={m.id} className={`p-5 ${m.senderParty === "Group" ? "bg-fondo-3 md:ml-12" : "bg-fondo-2 md:mr-12"}`}>
                            <p className="text-sm text-tinta-2 flex flex-wrap gap-x-3"><span>{m.senderName}</span><span className="tabular">{timeFmt.format(new Date(m.createdAt))}</span></p>
                            <p className="mt-2 whitespace-pre-line leading-relaxed">{m.body}</p>
                        </li>
                    ))}
                </ol>

                {actions.message && (
                    <form onSubmit={(e) => { e.preventDefault(); if (reply.trim()) send.mutate(); }} className="flex flex-col gap-3">
                        <label htmlFor="respuesta" className="text-sm font-medium text-tinta-2">Escribir un mensaje</label>
                        <textarea id="respuesta" value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={2000}
                            className="w-full bg-fondo-2 px-4 py-3 text-tinta outline-none focus-visible:outline-2 focus-visible:outline-acento focus-visible:-outline-offset-2 resize-y" />
                        <button type="submit" disabled={!reply.trim() || busy} className="self-start h-12 px-6 bg-fondo-3 text-tinta font-semibold hover:bg-fondo-2 disabled:opacity-45">
                            {send.isPending ? "Enviando…" : "Enviar mensaje"}
                        </button>
                    </form>
                )}

                {actions.requestAgain && (
                    <div className="bg-fondo-2 p-5">
                        <p className="text-tinta">Esta solicitud está cerrada. Si quieres otra fecha con {r.groupName}, envíale una solicitud nueva.</p>
                        <Link href={`${ROUTES.GROUPS.PUBLIC_PROFILE(r.groupSlug)}#solicitar`} className="mt-4 inline-flex h-12 items-center px-6 bg-acento text-acento-ink rounded-full font-semibold no-underline hover:bg-acento-press">
                            Pedir otra fecha
                        </Link>
                    </div>
                )}

                {failed && <p role="alert" className="text-error">{apiErrorMessage(failed.error, "No se pudo completar la acción. Inténtalo de nuevo.")}</p>}

                {(actions.accept || actions.decline || actions.cancel) && (
                    <div className="flex flex-wrap gap-3 pt-2">
                        {actions.accept && (
                            <button type="button" disabled={busy} onClick={() => accept.mutate()} className="h-14 px-7 bg-acento text-acento-ink rounded-full font-semibold hover:bg-acento-press disabled:opacity-45">
                                Aceptar la fecha
                            </button>
                        )}
                        {actions.decline && (
                            <button type="button" disabled={busy} onClick={() => decline.mutate()} className="h-14 px-7 bg-fondo-2 text-tinta font-semibold hover:bg-fondo-3 disabled:opacity-45">
                                Rechazar
                            </button>
                        )}
                        {actions.cancel && (
                            <button type="button" disabled={busy}
                                onClick={() => { if (window.confirm("¿Cancelar esta solicitud? El grupo recibirá un aviso.")) cancel.mutate(); }}
                                className="h-14 px-7 bg-transparent text-tinta underline decoration-error decoration-2 underline-offset-4 disabled:opacity-45">
                                Cancelar solicitud
                            </button>
                        )}
                    </div>
                )}
            </section>
        </article>
    );
}
