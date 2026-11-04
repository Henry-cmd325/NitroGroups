import { afterEach, describe, expect, it } from "vitest";
import { getSessionSecret } from "./sessionSecret";

const original = process.env.AUTH0_SECRET;
afterEach(() => { process.env.AUTH0_SECRET = original; });

describe("getSessionSecret", () => {
    it("falla cerrado sin secreto", () => {
        delete process.env.AUTH0_SECRET;
        expect(() => getSessionSecret()).toThrow(/AUTH0_SECRET/);
    });
    it("falla cerrado con un secreto corto", () => {
        process.env.AUTH0_SECRET = "corto";
        expect(() => getSessionSecret()).toThrow(/32/);
    });
    it("acepta un secreto de 32 caracteres o más", () => {
        process.env.AUTH0_SECRET = "a".repeat(32);
        expect(getSessionSecret()).toHaveLength(32);
    });
});
