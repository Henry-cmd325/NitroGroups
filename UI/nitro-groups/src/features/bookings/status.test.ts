import { describe, expect, it } from "vitest";
import { availableActions, shortTime, statusLabel } from "./status";

describe("availableActions", () => {
    it("el grupo responde solo solicitudes pendientes", () => {
        expect(availableActions({ status: "Pending" }, "Group")).toMatchObject({ accept: true, decline: true, cancel: false });
        expect(availableActions({ status: "Accepted" }, "Group")).toMatchObject({ accept: false, decline: false, cancel: true });
    });
    it("el cliente cancela pendientes o aceptadas, nunca acepta", () => {
        expect(availableActions({ status: "Pending" }, "Client")).toMatchObject({ accept: false, cancel: true });
        expect(availableActions({ status: "Accepted" }, "Client")).toMatchObject({ cancel: true });
        expect(availableActions({ status: "Declined" }, "Client")).toMatchObject({ cancel: false, message: false });
    });
    it("no se escribe en solicitudes cerradas", () => {
        expect(availableActions({ status: "Cancelled" }, "Group").message).toBe(false);
    });
});

describe("statusLabel", () => {
    it("nombra el pendiente según quién mira", () => {
        expect(statusLabel("Pending", "Client")).toBe("Esperando respuesta del grupo");
        expect(statusLabel("Pending", "Group")).toBe("Por responder");
    });
});

describe("shortTime", () => {
    it("recorta los segundos", () => {
        expect(shortTime("20:00:00")).toBe("20:00");
        expect(shortTime(null)).toBeNull();
    });
});
