"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Parte un nombre en una o dos líneas de largo parecido, siempre entre palabras. */
export function splitName(name: string, maxOneLine = 12): string[] {
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length <= maxOneLine || !clean.includes(" ")) return [clean];
    const words = clean.split(" ");
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
        const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
        if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/**
 * Una línea del cartel, ajustada al ancho de su contenedor: texto real cuyo tamaño se calcula
 * midiendo la línea con la fuente ya cargada. Antes de medir usa una estimación en vw.
 */
function FittedLine({ text }: { text: string }) {
    const box = useRef<HTMLSpanElement>(null);
    const line = useRef<HTMLSpanElement>(null);
    const [size, setSize] = useState<string>(`${Math.min(24, 118 / Math.max(text.length, 1))}vw`);

    useLayoutEffect(() => {
        const fit = () => {
            const outer = box.current;
            const inner = line.current;
            if (!outer || !inner) return;
            const previous = inner.style.fontSize;
            inner.style.fontSize = "100px";
            const natural = inner.getBoundingClientRect().width;
            const available = outer.getBoundingClientRect().width;
            const next = natural > 0 && available > 0 ? `${Math.floor((available / natural) * 100 * 0.995)}px` : previous;
            // Se escribe directo y en el estado: si el valor no cambia, React no vuelve a pintar el estilo.
            inner.style.fontSize = next;
            setSize(next);
        };
        fit();
        document.fonts?.ready.then(fit).catch(() => undefined);
        const ro = new ResizeObserver(fit);
        if (box.current) ro.observe(box.current);
        return () => ro.disconnect();
    }, [text]);

    return (
        <span ref={box} className="block w-full min-w-0 max-w-full overflow-hidden" aria-hidden>
            <span ref={line} className="type-poster inline-block whitespace-nowrap leading-[0.86]" style={{ fontSize: size }}>
                {text}
            </span>
        </span>
    );
}

/** El nombre del grupo como monumento: de margen a margen, en una o dos líneas. */
export function Monument({ name, className }: { name: string; className?: string }) {
    const lines = splitName(name);
    return (
        <span className={cn("block", className)}>
            <span className="sr-only">{name}</span>
            <span className="flex flex-col">
                {lines.map((line) => <FittedLine key={line} text={line} />)}
            </span>
        </span>
    );
}
