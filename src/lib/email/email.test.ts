import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";
import { makeT } from "@/i18n/core";
import { cancelWatch, confirmWatch, pickAlerts, requestWatch, runWatchAlerts, CONFIRM_PER_HOUR } from "@/lib/watches";
import { esc, toText } from "./layout";
import { sendLogged } from "./notify";
import { PREVIEWS, renderPreview, type PreviewKey } from "./previews";
import { sampleOrder, sampleOrderItems } from "./samples";
import { deliver } from "./send";
import * as tpl from "./templates";

const SITE = "https://pokelou.test";
const ctx = (l: "cs" | "en") => ({ t: makeT(l, 25), site: SITE });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("odeslání přes Resend", () => {
  it("bez klíče nic neposílá", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const f = vi.fn();
    expect(await deliver({ to: "a@b.cz", subject: "x", html: "<p>x</p>", text: "x" }, { fetchImpl: f })).toMatchObject({ status: "skipped" });
    expect(f).not.toHaveBeenCalled();
  });

  it("pošle správný požadavek včetně vloženého obrázku a klíče proti duplicitě", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "PokeLou <objednavky@pokelou.cz>");
    const f = vi.fn(async () => new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));
    const r = await deliver(
      { to: "a@b.cz", subject: "Ahoj", html: "<p>x</p>", text: "x", replyTo: "info@pokelou.cz", attachments: [{ filename: "qr.png", content: "AAA", contentId: "qr" }] },
      { fetchImpl: f as unknown as typeof fetch, idempotencyKey: "order:1:created" },
    );
    expect(r).toEqual({ status: "sent", providerId: "msg_1" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("order:1:created");
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: "PokeLou <objednavky@pokelou.cz>",
      to: ["a@b.cz"],
      reply_to: "info@pokelou.cz",
      attachments: [{ filename: "qr.png", content: "AAA", content_id: "qr" }],
    });
  });

  it("chybu služby vrátí, nevyhodí", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const bad = vi.fn(async () => new Response(JSON.stringify({ name: "validation_error", message: "Invalid from" }), { status: 422 }));
    expect(await deliver({ to: "a@b.cz", subject: "x", html: "", text: "" }, { fetchImpl: bad as unknown as typeof fetch })).toMatchObject({ status: "failed", error: expect.stringContaining("Invalid from") });
    const down = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    expect(await deliver({ to: "a@b.cz", subject: "x", html: "", text: "" }, { fetchImpl: down as unknown as typeof fetch })).toMatchObject({ status: "failed", error: "ECONNRESET" });
  });
});

describe("šablony", () => {
  const keys = Object.keys(PREVIEWS) as PreviewKey[];

  it.each(keys.flatMap((k) => [[k, "cs"], [k, "en"]] as const))("%s (%s) se vykreslí celé", async (key, lang) => {
    const r = await renderPreview(key, lang, SITE, 25);
    expect(r.subject.length).toBeGreaterThan(5);
    for (const part of [r.subject, r.html, r.text]) expect(part).not.toMatch(/undefined|NaN|\[object|\{\w+\}/);
    expect(r.html).toContain(`${SITE}/brand/logo-email.png`);
    expect(r.text.length).toBeGreaterThan(50);
    if (lang === "en" && !key.startsWith("shop_")) expect(r.html).toContain('lang="en"');
  });

  it("potvrzení objednávky převodem: QR kód jako vložený obrázek, údaje k platbě, odkaz", async () => {
    const r = await renderPreview("order_created", "cs", SITE, 25);
    expect(r.html).toContain('src="cid:qr-platba"');
    expect(r.attachments?.[0]).toMatchObject({ contentId: "qr-platba", filename: "qr-platba.png" });
    expect(r.html).toContain("2611482100");
    expect(r.html).toContain("4 270 Kč");
    expect(r.html).toContain(`${SITE}/objednavka/00000000-0000-4000-8000-000000000001`);
    expect(r.text).toContain(`Zobrazit objednávku → (${SITE}/objednavka/`);
  });

  it("anglicky: závazná částka v korunách, eura orientačně", async () => {
    const r = await renderPreview("order_created", "en", SITE, 25);
    expect(r.subject).toBe("Order PL-2611-4821 received");
    expect(r.html).toContain("4,270 CZK");
    expect(r.html).toContain("≈ €170.80");
  });

  it("údaje od zákazníka jsou escapované", () => {
    const o = sampleOrder({ name: "<script>alert(1)</script> Eva", note: '"><img src=x onerror=alert(1)>' });
    const r = tpl.orderCreated(ctx("cs"), o, sampleOrderItems, null);
    expect(r.html).not.toContain("<script>alert");
    expect(r.html).not.toContain("<img src=x");
    expect(r.html).toContain(esc('"><img src=x onerror=alert(1)>'));
  });

  it("e-maily o stavu jen u kroků, které zákazníka zajímají", () => {
    const o = sampleOrder();
    expect(tpl.orderStatus(ctx("cs"), o, "paid")).not.toBeNull();
    expect(tpl.orderStatus(ctx("cs"), sampleOrder({ paymentMethod: "cod" }), "paid")).toBeNull();
    expect(tpl.orderStatus(ctx("cs"), o, "packed")).toBeNull(); // balení se hlásí jen u osobního odběru
    expect(tpl.orderStatus(ctx("cs"), o, "delivered")).toBeNull();
    const shipped = tpl.orderStatus(ctx("cs"), o, "shipped")!;
    expect(shipped.html).toContain("Z 123 4567 890");
    expect(shipped.html).toContain("tracking.packeta.com");
  });

  it("textová verze má odkazy a žádné značky", () => {
    const text = toText('<p>Ahoj <a href="https://x.cz/a">tady</a>&nbsp;&amp; <strong>tam</strong></p>');
    expect(text).toBe("Ahoj tady (https://x.cz/a) & tam");
  });
});

describe("hlídání karty", () => {
  it("komu poslat upozornění", () => {
    const w = (id: string, maxPriceHal: number | null, notifiedHal: number | null = null) => ({ id, cardId: id, maxPriceHal, notifiedHal });
    const cheapest = new Map([
      ["a", 500_00],
      ["b", 500_00],
      ["c", 500_00],
      ["d", 400_00],
    ]);
    const r = pickAlerts([w("a", null), w("b", 450_00), w("c", 600_00, 500_00), w("d", null, 500_00), w("e", null, 300_00)], cheapest);
    // a: skladem, ještě nepsali · b: dráž než limit · c: už psali za stejnou cenu · d: zlevnila od minula · e: není skladem → vynulovat
    expect(r.notify).toEqual([
      { id: "a", priceHal: 500_00 },
      { id: "d", priceHal: 400_00 },
    ]);
    expect(r.reset).toEqual(["e"]);
  });
});

describe("s databází", () => {
  let db: Db;
  beforeEach(async () => {
    const d = drizzle(new PGlite(), { schema: s });
    await migrate(d, { migrationsFolder: "./drizzle" });
    db = d as unknown as Db;
    await seedDemo(db, "2026-10-27");
    vi.stubEnv("RESEND_API_KEY", "re_test");
  });

  const mockResend = () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ id: `msg_${Math.random()}` }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    return f;
  };
  const r = { subject: "Test", html: "<p>x</p>", text: "x" };

  it("stejný e-mail se nepošle dvakrát, po chybě jde poslat znovu", async () => {
    const f = mockResend();
    expect((await sendLogged(db, "order_created", "order:1:created", "a@b.cz", r)).status).toBe("sent");
    expect((await sendLogged(db, "order_created", "order:1:created", "a@b.cz", r)).status).toBe("duplicate");
    expect(f).toHaveBeenCalledTimes(1);

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    expect((await sendLogged(db, "order_shipped", "order:1:shipped", "a@b.cz", r)).status).toBe("failed");
    mockResend();
    expect((await sendLogged(db, "order_shipped", "order:1:shipped", "a@b.cz", r)).status).toBe("sent");
    const log = await db.select().from(s.emailLog);
    expect(log.map((l) => l.status).sort()).toEqual(["failed", "sent", "sent"]);
  });

  it("hlídání: potvrzení e-mailem, limit potvrzení, upozornění jen jednou a zrušení", async () => {
    const f = mockResend();
    const stock = (await db.select().from(s.stockItems)).find((x) => x.quantity > 0)!;
    const cardId = stock.cardId;
    await db.update(s.stockItems).set({ quantity: 0 }).where(eq(s.stockItems.cardId, cardId));

    expect(await requestWatch(db, { email: "Eva@Example.com", cardId, maxPriceHal: null, locale: "en" })).toBe("pending");
    expect(f).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.to).toEqual(["eva@example.com"]);
    expect(body.subject).toMatch(/^Confirm your alert for /);

    // opakované přihlášení bez potvrzení: další potvrzovací e-maily, ale nejvýš CONFIRM_PER_HOUR za hodinu
    for (let i = 0; i < CONFIRM_PER_HOUR + 2; i++) await requestWatch(db, { email: "eva@example.com", cardId, maxPriceHal: null, locale: "en" });
    expect(f).toHaveBeenCalledTimes(CONFIRM_PER_HOUR);

    // nepotvrzené hlídání neposílá upozornění
    await db.update(s.stockItems).set({ quantity: 1 }).where(eq(s.stockItems.id, stock.id));
    expect(await runWatchAlerts(db)).toMatchObject({ watches: 0, sent: 0 });

    const [w] = await db.select().from(s.watches);
    expect(await confirmWatch(db, w.token)).toBe(true);
    expect(await confirmWatch(db, w.token)).toBe(false);
    f.mockClear();
    expect(await runWatchAlerts(db)).toMatchObject({ watches: 1, sent: 1 });
    const alert = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(alert.subject).toMatch(/is back in stock$/);
    expect(alert.headers["List-Unsubscribe"]).toContain(`/api/hlidani/odhlasit?token=${w.token}`);

    // druhý den za stejnou cenu už nic
    expect(await runWatchAlerts(db, new Date(Date.now() + 86_400_000))).toMatchObject({ sent: 0 });
    // vyprodáno a znovu naskladněno → nové upozornění
    await db.update(s.stockItems).set({ quantity: 0 }).where(eq(s.stockItems.id, stock.id));
    expect(await runWatchAlerts(db)).toMatchObject({ reset: 1 });
    await db.update(s.stockItems).set({ quantity: 1 }).where(eq(s.stockItems.id, stock.id));
    expect(await runWatchAlerts(db, new Date(Date.now() + 2 * 86_400_000))).toMatchObject({ sent: 1 });

    // potvrzené hlídání se při novém přihlášení jen upraví
    expect(await requestWatch(db, { email: "eva@example.com", cardId, maxPriceHal: 100_00, locale: "en" })).toBe("updated");
    expect(await cancelWatch(db, w.token)).toBe(true);
    expect(await db.select().from(s.watches)).toEqual([]);
  });
});
