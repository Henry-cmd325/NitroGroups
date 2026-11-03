"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { todayInMexico } from "@/lib/format";
import { bookingsService, apiErrorMessage } from "../bookings.service";
import { EVENT_TYPES } from "../types";

const field = "h-12 w-full bg-fondo-2 px-4 text-tinta placeholder:text-tinta-2/70 outline-none focus-visible:outline-2 focus-visible:outline-acento focus-visible:-outline-offset-2";
const label = "block text-sm font-medium text-tinta-2 mb-2";
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

interface RequestFormProps {
    groupId: number;
    groupName: string;
    minimumHours: number;
    defaultDate?: string;
}

/** Solicitud de fecha a un grupo. Todo lo que el grupo necesita para responder, en una pantalla. */
export function RequestForm({ groupId, groupName, minimumHours, defaultDate }: RequestFormProps) {
    const id = useId();
    const [message, setMessage] = useState("");
    const minHours = Math.min(Math.max(minimumHours || 1, 1), 12);

    const create = useMutation({ mutationFn: bookingsService.create });

    if (create.isSuccess) {
        return (
            <div role="status" className="max-w-[56ch]">
                <p className="type-heading text-[2rem]">Solicitud enviada</p>
                <p className="mt-3 text-lg text-tinta">
                    {groupName} recibió tu solicitud y te va a responder por escrito. Te avisamos por email cuando lo haga.
                </p>
                <Link href={`/solicitudes/${create.data.id}`} className="mt-6 inline-block text-tinta underline decoration-acento decoration-2 underline-offset-4">
                    Ver la solicitud
                </Link>
            </div>
        );
    }

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
        create.mutate({
            groupId,
            eventDate: String(f.get("eventDate")),
            startTime: f.get("startTime") ? `${f.get("startTime")}:00` : null,
            durationHours: Number(f.get("durationHours")),
            eventType: String(f.get("eventType")),
            locationText: String(f.get("locationText")).trim(),
            guestCount: num("guestCount"),
            budget: num("budget"),
            message: message.trim(),
        });
    }

    const tooShort = message.trim().length < MESSAGE_MIN;

    return (
        <form onSubmit={onSubmit} className="grid md:grid-cols-6 gap-x-4 gap-y-6 max-w-4xl" aria-describedby={create.isError ? `${id}-error` : undefined}>
            <div className="md:col-span-2">
                <label htmlFor={`${id}-fecha`} className={label}>Fecha</label>
                <input id={`${id}-fecha`} name="eventDate" type="date" required min={todayInMexico()} defaultValue={defaultDate} className={`${field} [color-scheme:light]`} />
            </div>
            <div className="md:col-span-2">
                <label htmlFor={`${id}-hora`} className={label}>Hora de inicio <span className="text-tinta-2/70">(opcional)</span></label>
                <input id={`${id}-hora`} name="startTime" type="time" step={900} className={`${field} [color-scheme:light]`} />
            </div>
            <div className="md:col-span-2">
                <label htmlFor={`${id}-horas`} className={label}>Horas de música</label>
                <select id={`${id}-horas`} name="durationHours" defaultValue={minHours} className={field}>
                    {Array.from({ length: 13 - minHours }, (_, i) => minHours + i).map((h) => (
                        <option key={h} value={h}>{h} {h === 1 ? "hora" : "horas"}</option>
                    ))}
                </select>
            </div>
            <div className="md:col-span-2">
                <label htmlFor={`${id}-tipo`} className={label}>Qué celebras</label>
                <select id={`${id}-tipo`} name="eventType" required className={field} defaultValue="Boda">
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="md:col-span-4">
                <label htmlFor={`${id}-lugar`} className={label}>Lugar</label>
                <input id={`${id}-lugar`} name="locationText" required maxLength={200} placeholder="Salón Los Arcos, Zapopan" className={field} />
            </div>
            <div className="md:col-span-2">
                <label htmlFor={`${id}-invitados`} className={label}>Invitados <span className="text-tinta-2/70">(opcional)</span></label>
                <input id={`${id}-invitados`} name="guestCount" type="number" inputMode="numeric" min={1} max={5000} className={`${field} tabular`} />
            </div>
            <div className="md:col-span-2">
                <label htmlFor={`${id}-presupuesto`} className={label}>Presupuesto en MXN <span className="text-tinta-2/70">(opcional)</span></label>
                <input id={`${id}-presupuesto`} name="budget" type="number" inputMode="numeric" min={0} step={500} className={`${field} tabular`} />
            </div>
            <div className="md:col-span-6">
                <label htmlFor={`${id}-mensaje`} className={label}>Mensaje para {groupName}</label>
                <textarea
                    id={`${id}-mensaje`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    minLength={MESSAGE_MIN}
                    maxLength={MESSAGE_MAX}
                    rows={5}
                    aria-describedby={`${id}-mensaje-ayuda`}
                    placeholder="Es nuestra boda, queremos mariachi a la salida de la iglesia y una hora en la recepción."
                    className="w-full bg-fondo-2 px-4 py-3 text-tinta placeholder:text-tinta-2/70 outline-none focus-visible:outline-2 focus-visible:outline-acento focus-visible:-outline-offset-2 resize-y leading-relaxed"
                />
                <p id={`${id}-mensaje-ayuda`} className="mt-2 text-sm text-tinta-2 tabular">
                    {tooShort ? `Al menos ${MESSAGE_MIN} caracteres.` : `${message.length} de ${MESSAGE_MAX}`}
                </p>
            </div>
            {create.isError && (
                <p id={`${id}-error`} role="alert" className="md:col-span-6 text-error">
                    {apiErrorMessage(create.error, "No pudimos enviar la solicitud. Revisa los datos e inténtalo de nuevo.")}
                </p>
            )}
            <div className="md:col-span-6">
                <button
                    type="submit"
                    disabled={create.isPending || tooShort}
                    className="h-14 px-8 bg-acento text-fondo font-semibold hover:bg-acento-press transition-colors disabled:opacity-45 disabled:pointer-events-none"
                >
                    {create.isPending ? "Enviando…" : "Enviar solicitud"}
                </button>
            </div>
        </form>
    );
}
