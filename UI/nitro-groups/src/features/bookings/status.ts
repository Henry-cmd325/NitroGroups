import type { EventRequest, EventRequestParty, EventRequestStatus } from "./types";

/** Cómo se nombra cada estado ante cada parte. */
export function statusLabel(status: EventRequestStatus, viewer: EventRequestParty): string {
    switch (status) {
        case "Pending":
            return viewer === "Client" ? "Esperando respuesta del grupo" : "Por responder";
        case "Accepted":
            return "Aceptada";
        case "Declined":
            return "Rechazada";
        case "Cancelled":
            return "Cancelada";
    }
}

/** Acciones disponibles: reflejan las transiciones que acepta la API (si no, devuelve 409). */
export function availableActions(request: Pick<EventRequest, "status">, viewer: EventRequestParty) {
    const { status } = request;
    return {
        accept: viewer === "Group" && status === "Pending",
        decline: viewer === "Group" && status === "Pending",
        cancel: viewer === "Client" ? status === "Pending" || status === "Accepted" : status === "Accepted",
        message: status === "Pending" || status === "Accepted",
        // Una solicitud cerrada no se reabre: otra fecha es una solicitud nueva.
        requestAgain: viewer === "Client" && (status === "Declined" || status === "Cancelled"),
    };
}

/** "20:00" a partir de "20:00:00". */
export function shortTime(time: string | null): string | null {
    return time ? time.slice(0, 5) : null;
}
