"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";

interface PasosProps {
    /** Nombre real de un grupo del catálogo, para que los ejemplos no sean genéricos. */
    groupName: string;
    price: string;
}

const STEPS = [
    {
        title: "Busca por fecha",
        body: "Elige el día de tu evento y ve solo a los grupos que lo tienen libre, con su precio desde el principio.",
    },
    {
        title: "Pide en una sola solicitud",
        body: "Fecha, lugar, horas de música, invitados y presupuesto. El grupo tiene todo para responder sin llamarte.",
    },
    {
        title: "Confirma por escrito",
        body: "El grupo acepta o te propone otra cosa. La conversación queda guardada junto con la fecha y el precio.",
    },
    {
        title: "Para grupos: tu agenda en orden",
        body: "Las solicitudes llegan a una bandeja con fecha y presupuesto. Tú decides cuáles aceptas.",
    },
];

const DURATION = 6500;

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
    const mq = window.matchMedia(REDUCED);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
}
function prefersReducedMotion() {
    return window.matchMedia(REDUCED).matches;
}

/** Lo que muestra cada paso: un fragmento de la app con datos de ejemplo. */
function Panel({ step, groupName, price }: { step: number } & PasosProps) {
    const row = "flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3";
    switch (step) {
        case 0:
            return (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        {["vie 13", "sáb 14", "dom 15", "sáb 21"].map((d, i) => (
                            <span key={d} className={`rounded-full px-3.5 py-1.5 text-sm ${i === 1 ? "bg-acento text-acento-ink" : "bg-white/[0.05] text-tinta-2"}`}>{d}</span>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {[groupName, "Trío Sierra", "Sonora La Luna"].map((n, i) => (
                            <div key={n} className={row}>
                                <span>{n}</span>
                                <span className="text-sm text-ok">{i === 0 ? price : "Disponible"}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 1:
            return (
                <div className="grid grid-cols-2 gap-2">
                    {[["Fecha", "sáb 14 de noviembre"], ["Horas", "3 horas"], ["Lugar", "Hacienda Santa Cruz"], ["Invitados", "180"], ["Evento", "Boda"], ["Presupuesto", "$20,000"]].map(([k, v]) => (
                        <div key={k} className="rounded-xl bg-white/[0.03] px-4 py-3">
                            <p className="text-[0.8125rem] text-tinta-2">{k}</p>
                            <p className="mt-0.5">{v}</p>
                        </div>
                    ))}
                </div>
            );
        case 2:
            return (
                <div className="space-y-2.5">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(143_220_178/0.12)] px-3 py-1 text-sm text-ok">
                        <Check className="size-3.5" aria-hidden /> Aceptada
                    </p>
                    <p className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.05] px-4 py-3">Es nuestra boda. ¿Pueden tocar a la salida de la iglesia?</p>
                    <p className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-acento/15 px-4 py-3">Con gusto. Llegamos 45 minutos antes para montar.</p>
                </div>
            );
        default:
            return (
                <div className="space-y-2">
                    {[["Carlos Méndez", "Cumpleaños, 12 dic", "Por responder"], ["Fernanda Ruiz", "XV años, 20 dic", "Por responder"], ["Ana López", "Boda, 11 ene", "Aceptada"]].map(([n, e, s]) => (
                        <div key={n} className={row}>
                            <span>
                                <span className="block">{n}</span>
                                <span className="block text-sm text-tinta-2">{e}</span>
                            </span>
                            <span className={`text-sm ${s === "Aceptada" ? "text-ok" : "text-acento"}`}>{s}</span>
                        </div>
                    ))}
                </div>
            );
    }
}

/**
 * Cómo funciona: una lista que se despliega a la izquierda y, a la derecha, un panel de vidrio con
 * el fragmento de la app de ese paso. Avanza sola; se pausa al pasar el cursor o enfocar, y con
 * movimiento reducido no avanza.
 */
export function Pasos({ groupName, price }: PasosProps) {
    const id = useId();
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);

    useEffect(() => {
        if (paused || reduced) return;
        const t = window.setTimeout(() => setActive((a) => (a + 1) % STEPS.length), DURATION);
        return () => window.clearTimeout(t);
    }, [active, paused, reduced]);

    return (
        <div
            className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-10 items-stretch"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <ul className="flex flex-col gap-2">
                {STEPS.map((s, i) => {
                    const open = i === active;
                    return (
                        <li key={s.title} className={`superficie rounded-2xl transition-colors duration-500 ${open ? "bg-fondo-3/60" : ""}`}>
                            <button
                                type="button"
                                id={`${id}-tab-${i}`}
                                aria-expanded={open}
                                aria-controls={`${id}-panel`}
                                onClick={() => setActive(i)}
                                className="w-full text-left px-5 py-4"
                            >
                                <span className={`block text-[1.0625rem] font-medium tracking-[-0.02em] transition-colors ${open ? "text-tinta" : "text-tinta-2 hover:text-tinta"}`}>{s.title}</span>
                                <span className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out)] ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                    <span className="overflow-hidden">
                                        <span className="block pt-2 text-base text-tinta-2 max-w-[42ch]">{s.body}</span>
                                    </span>
                                </span>
                            </button>
                            {open && !reduced && (
                                <span aria-hidden className="mx-5 mb-4 block h-px overflow-hidden bg-white/10">
                                    <span key={`${active}-${paused}`} className={`block h-full bg-acento origin-left ${paused ? "scale-x-0" : "animate-[progreso_6500ms_linear_forwards]"}`} />
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>

            <div id={`${id}-panel`} aria-live="polite" className="relative overflow-hidden rounded-[28px] superficie min-h-[22rem] grid place-items-center p-6 md:p-10">
                <div className="resplandor resplandor-vivo w-[70%] aspect-square -right-[10%] -top-[20%]" aria-hidden />
                <div key={active} className="aparece relative w-full max-w-md vidrio rounded-3xl p-5">
                    <Panel step={active} groupName={groupName} price={price} />
                </div>
            </div>
        </div>
    );
}
