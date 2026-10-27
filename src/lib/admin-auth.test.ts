import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from "./admin-auth";

describe("přihlášení do administrace", () => {
  it("heslo ověří jen správné", async () => {
    const h = await hashPassword("správné-heslo-123");
    expect(h).toMatch(/^scrypt:16384:/);
    expect(await verifyPassword("správné-heslo-123", h)).toBe(true);
    expect(await verifyPassword("spatne-heslo-123", h)).toBe(false);
    expect(await verifyPassword("cokoli", undefined)).toBe(false);
    expect(await verifyPassword("cokoli", "nesmysl")).toBe(false);
  });

  it("relace: podpis, platnost a cizí klíč", () => {
    const secret = "a".repeat(40);
    const t = createSessionToken(secret, 1_000);
    expect(verifySessionToken(t, secret, 2_000)).toBe(true);
    expect(verifySessionToken(t, secret, 1_000 + 13 * 3600_000)).toBe(false); // vypršela
    expect(verifySessionToken(t, "b".repeat(40), 2_000)).toBe(false); // jiný klíč
    const [p] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ exp: 9e15 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${t.split(".")[1]}`, secret, 2_000)).toBe(false); // změněný obsah
    expect(verifySessionToken(p, secret, 2_000)).toBe(false);
    expect(verifySessionToken(undefined, secret)).toBe(false);
  });
});
