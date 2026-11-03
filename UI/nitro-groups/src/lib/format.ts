const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/** "$18,000" — precios redondos, sin centavos. */
export function formatPrice(value: number | null | undefined, currency = "MXN"): string | null {
    if (value == null) return null;
    if (currency === "MXN") return mxn.format(value);
    return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

const longDate = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** "sábado 12 de diciembre" a partir de "2026-12-12". */
export function formatEventDate(isoDate: string): string {
    const [y, m, d] = isoDate.split("-").map(Number);
    return longDate.format(new Date(Date.UTC(y, m - 1, d)));
}
