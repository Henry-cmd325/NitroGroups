import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./safeRedirect";

describe("safeReturnTo", () => {
    it.each([
        ["https://evil.example/x", "/dashboard"],
        ["//evil.example/x", "/dashboard"],
        ["/\\evil.example", "/dashboard"],
        ["javascript:alert(1)", "/dashboard"],
        [null, "/dashboard"],
        ["/groups/vargas?fecha=2026-12-12#solicitar", "/groups/vargas?fecha=2026-12-12#solicitar"],
    ])("%s → %s", (input, expected) => {
        expect(safeReturnTo(input)).toBe(expected);
    });
});
