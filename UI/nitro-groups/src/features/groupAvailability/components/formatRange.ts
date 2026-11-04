/**
 * Rango de un bloque del calendario en español: "sábado 12 de diciembre, 20:00 a 23:00" si cae
 * en un día; "12 dic 22:00 a 13 dic 02:00" si cruza la medianoche. Devuelve el texto crudo si
 * alguna fecha no es válida.
 */
export function formatRangeLabel(startStr: string, endStr: string, timeZone?: string): string {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startStr} a ${endStr}`;

    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    const time = new Intl.DateTimeFormat("es-MX", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

    // Un bloque de día completo termina a las 00:00 del día siguiente: cuenta como el mismo día.
    const endForDay = new Date(e.getTime() - 1);
    if (dayKey.format(s) === dayKey.format(endForDay)) {
        const day = new Intl.DateTimeFormat("es-MX", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(s).replace(",", "");
        const isAllDay = time.format(s) === "00:00" && time.format(e) === "00:00";
        return isAllDay ? `${day}, todo el día` : `${day}, ${time.format(s)} a ${time.format(e)}`;
    }

    const short = new Intl.DateTimeFormat("es-MX", { timeZone, day: "numeric", month: "short" });
    const strip = (d: Date) => short.format(d).replace(".", "");
    return `${strip(s)} ${time.format(s)} a ${strip(e)} ${time.format(e)}`;
}
