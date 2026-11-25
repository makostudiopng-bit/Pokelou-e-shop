// Obsah e-mailů. Čisté funkce: dostanou data a jazyk, vrátí předmět, HTML a text.
// Zákaznické e-maily jsou v jazyce, ve kterém zákazník web používal (cs / en),
// upozornění pro obchod jsou vždy česky.
import { PAYMENT, SHIPPING, SHOP } from "@/config/shop";
import type { buybackRequests, orderItems, orders } from "@/db/schema";
import { tk, type T } from "@/i18n/core";
import type { Attachment } from "./send";
import { button, C, esc, h2, layout, lines, p, panel, rows, steps, toText } from "./layout";

type Order = typeof orders.$inferSelect;
type OrderItem = Pick<typeof orderItems.$inferSelect, "title" | "condition" | "language" | "quantity" | "unitHal">;
type Buyback = typeof buybackRequests.$inferSelect;
export type BuybackLine = { name: string; set: string; number: string; quantity: number; estimateHal: number | null; finalHal?: number | null };

export type Rendered = { subject: string; html: string; text: string; attachments?: Attachment[] };
export type Ctx = { t: T; site: string };

const done = (ctx: Ctx, subject: string, o: { preheader: string; title: string; body: string; footerNote?: string }, attachments?: Attachment[]): Rendered => {
  const html = layout({ t: ctx.t, site: ctx.site, ...o });
  return { subject, html, text: toText(html), attachments };
};

/** Částka v korunách, v angličtině s orientačním přepočtem na eura (v tabulce na dalším řádku). */
const money = (t: T, hal: number, block = false) =>
  `<span style="white-space:nowrap">${esc(t.czk(hal))}</span>` +
  (t.eur(hal) ? `${block ? "<br>" : " "}<span style="color:${C.muted};font-weight:400;font-size:13px;white-space:nowrap">${block ? esc(t.eur(hal)) : `(${esc(t.eur(hal))})`}</span>` : "");

/**
 * Oslovení. Česky bez jména: „Ahoj Jana“ místo 5. pádu „Jano“ zní strojově a skloňovat
 * jména automaticky spolehlivě nejde. Anglicky křestním jménem.
 */
const hello = (t: T, name: string | null | undefined) => {
  const first = name?.trim().split(/\s+/)[0];
  return p(first && t.locale !== "cs" ? esc(t("Ahoj {name},", { name: first })) : esc(t("Ahoj,")));
};

const shipTitle = (t: T, id: string) => t(SHIPPING.find((s) => s.id === id)?.title ?? id);
const payTitle = (t: T, id: string) => t(PAYMENT.find((s) => s.id === id)?.title ?? id);

const contactLine = (t: T) =>
  p(`${esc(t("Máš dotaz? Stačí odpovědět na tento e-mail, nebo napsat na"))} <a href="mailto:${esc(SHOP.email)}" style="color:${C.ink}">${esc(SHOP.email)}</a>.`, true);

function orderItemsBlock(t: T, o: Order, items: OrderItem[]) {
  const total: [string, string][] = [[t("Karty"), money(t, o.itemsHal, true)]];
  if (o.discountHal > 0) total.push([`${t("Sleva")} · ${o.discountCode ?? ""}`, `−${esc(t.czk(o.discountHal))}`]);
  total.push([`${t("Doprava")} · ${shipTitle(t, o.shippingMethod)}`, o.shippingHal ? esc(t.czk(o.shippingHal)) : esc(t("zdarma"))]);
  if (o.codFeeHal > 0) total.push([t("Dobírka"), esc(t.czk(o.codFeeHal))]);
  total.push([t("Celkem"), money(t, o.totalHal, true)]);
  return (
    lines(items.map((i) => ({ title: i.title, meta: `${i.condition} · ${i.language} · ${i.quantity} ${t("ks")}`, amount: esc(t.czk(i.unitHal * i.quantity)) }))) +
    rows(total, { strongLast: true })
  );
}

function deliveryBlock(t: T, o: Order) {
  const point = (o.shippingPoint as { name?: string } | null)?.name;
  const addr = o.address as { street?: string; city?: string; zip?: string } | null;
  const r: [string, string][] = [[t("Doprava"), esc(shipTitle(t, o.shippingMethod))]];
  if (o.shippingMethod === "zasilkovna" && point) r.push([t("Výdejní místo"), esc(point)]);
  if (o.shippingMethod === "ceska_posta" && addr) r.push([t("Adresa"), esc([addr.street, `${addr.zip ?? ""} ${addr.city ?? ""}`.trim()].filter(Boolean).join(", "))]);
  if (o.shippingMethod === "pickup") r.push([t("Vyzvednutí"), esc(SHOP.pickupAddress)]);
  r.push([t("Platba"), esc(payTitle(t, o.paymentMethod))]);
  if (o.note) r.push([t("Tvoje poznámka"), esc(o.note)]);
  return rows(r);
}

const ORDER_NEXT: Record<string, [string, string][]> = {
  zasilkovna: [
    [tk("Zabalíme karty"), tk("Každou do obalu a toploaderu, celé do pevné obálky.")],
    [tk("Předáme Zásilkovně"), tk("Pošleme ti e-mail se sledovacím číslem.")],
    [tk("Vyzvedneš si je"), tk("Na výdejním místě, o příchodu ti dá vědět Zásilkovna.")],
  ],
  ceska_posta: [
    [tk("Zabalíme karty"), tk("Každou do obalu a toploaderu, celé do pevné obálky.")],
    [tk("Předáme poště"), tk("Pošleme ti e-mail se sledovacím číslem.")],
    [tk("Doručí ti je domů"), tk("Balík do ruky na adresu z objednávky.")],
  ],
  pickup: [
    [tk("Připravíme karty"), tk("Každou do obalu a toploaderu.")],
    [tk("Napíšeme ti"), tk("Jakmile bude objednávka připravená k vyzvednutí.")],
    [tk("Vyzvedneš si je"), tk("Na adrese pro osobní odběr.")],
  ],
};

/** Údaje pro platbu převodem; qrPng je base64 PNG s QR platbou (vloží se do e-mailu jako obrázek). */
export type TransferInfo = { account: string; iban: string; qrPng: string | null } | null;

export function orderCreated(ctx: Ctx, o: Order, items: OrderItem[], transfer: TransferInfo): Rendered {
  const { t, site } = ctx;
  const url = `${site}/objednavka/${o.id}`;
  let pay = "";
  const attachments: Attachment[] = [];
  if (o.paymentMethod === "bank_transfer") {
    if (transfer) {
      const qr = transfer.qrPng
        ? `<td width="150" style="padding-left:14px;vertical-align:top"><img src="cid:qr-platba" width="140" height="140" alt="${esc(t("QR platba {amount}", { amount: t.czk(o.totalHal) }))}" style="display:block;border:0"></td>`
        : "";
      if (transfer.qrPng) attachments.push({ filename: "qr-platba.png", content: transfer.qrPng, contentId: "qr-platba" });
      pay = panel(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top">` +
          `<strong style="font:900 17px/22px Arial,sans-serif">${esc(t("Zaplať převodem"))}</strong><br><br>` +
          rows([
            [t("Částka"), money(t, o.totalHal, true)],
            [t("Číslo účtu"), `<span style="white-space:nowrap">${esc(transfer.account)}</span>`],
            [t("Variabilní symbol"), esc(o.paymentRef ?? "")],
          ]) +
          `</td>${qr}</tr></table>` +
          `<p style="margin:10px 0 0;font:14px/20px Arial,sans-serif;color:${C.muted}">${esc(t("Naskenuj QR kód v aplikaci banky, nebo zadej údaje ručně. Karty odešleme, jakmile platba dorazí."))}</p>`,
      );
    } else {
      pay = panel(p(esc(t("Platební údaje ti pošleme v dalším e-mailu.")), true));
    }
  } else if (o.paymentMethod === "cod") {
    pay = panel(p(`${esc(t("Při převzetí zaplatíš"))} <strong>${money(t, o.totalHal)}</strong>.`));
  }
  const body =
    hello(t, o.name) +
    p(esc(t("díky za objednávku! Tady je její shrnutí."))) +
    pay +
    h2(t("Tvoje objednávka")) +
    orderItemsBlock(t, o, items) +
    h2(t("Doručení a platba")) +
    deliveryBlock(t, o) +
    h2(t("Co bude dál")) +
    steps((ORDER_NEXT[o.shippingMethod] ?? ORDER_NEXT.zasilkovna).map(([a, b]) => [t(a), t(b)])) +
    button(url, t("Zobrazit objednávku")) +
    contactLine(t);
  return done(
    ctx,
    t("Objednávka {number} je přijatá", { number: o.number }),
    { preheader: t("Celkem {amount}. Díky za nákup v PokeLou!", { amount: t.czk(o.totalHal) }), title: t("Díky, karty jsou tvoje!"), body },
    attachments,
  );
}

/** E-mail při změně stavu objednávky; null, když se pro tenhle krok nic neposílá. */
export function orderStatus(ctx: Ctx, o: Order, to: Order["status"]): Rendered | null {
  const { t, site } = ctx;
  const url = `${site}/objednavka/${o.id}`;
  const subj = (s: string) => t(s, { number: o.number });
  if (to === "paid" && o.paymentMethod === "bank_transfer") {
    return done(ctx, subj(tk("Platba za objednávku {number} dorazila")), {
      preheader: t("Karty teď balíme."),
      title: t("Platba dorazila"),
      body:
        hello(t, o.name) +
        p(esc(t("platba {amount} za objednávku {number} dorazila. Díky! Karty teď balíme a brzy vyrazí.", { amount: t.czk(o.totalHal), number: o.number }))) +
        button(url, t("Zobrazit objednávku")) +
        contactLine(t),
    });
  }
  if (to === "packed" && o.shippingMethod === "pickup") {
    const cod = o.paymentMethod === "cod" ? p(`${esc(t("Při převzetí zaplatíš"))} <strong>${money(t, o.totalHal)}</strong>.`) : "";
    return done(ctx, subj(tk("Objednávka {number} je připravená k vyzvednutí")), {
      preheader: t("Vyzvedneš si ji na adrese pro osobní odběr."),
      title: t("Můžeš si ji vyzvednout"),
      body:
        hello(t, o.name) +
        p(esc(t("objednávka {number} je zabalená a čeká na tebe.", { number: o.number }))) +
        panel(rows([[t("Adresa"), esc(SHOP.pickupAddress)], [t("Objednávka"), esc(o.number)]])) +
        cod +
        button(url, t("Zobrazit objednávku")) +
        contactLine(t),
    });
  }
  if (to === "shipped") {
    const zas = o.shippingMethod === "zasilkovna";
    const track = o.trackingNumber
      ? panel(
          rows([
            [t("Dopravce"), esc(shipTitle(t, o.shippingMethod))],
            [t("Číslo zásilky"), `<span style="font-family:Consolas,Menlo,monospace">${esc(o.trackingNumber)}</span>`],
          ]) +
            `<p style="margin:10px 0 0;font:14px/20px Arial,sans-serif;color:${C.muted}">${esc(t("Zásilku sleduješ podle čísla na"))} ` +
            (zas
              ? `<a href="https://tracking.packeta.com/" style="color:${C.ink}">tracking.packeta.com</a>`
              : `<a href="https://www.ceskaposta.cz/" style="color:${C.ink}">ceskaposta.cz</a>`) +
            `.</p>`,
        )
      : "";
    const cod = o.paymentMethod === "cod" ? p(`${esc(t("Při převzetí zaplatíš"))} <strong>${money(t, o.totalHal)}</strong>.`) : "";
    return done(ctx, subj(tk("Objednávka {number} je na cestě")), {
      preheader: zas ? t("Až dorazí na výdejní místo, dá ti vědět Zásilkovna.") : t("Pošta ti ji doručí na adresu z objednávky."),
      title: t("Karty jsou na cestě"),
      body:
        hello(t, o.name) +
        p(esc(t("objednávku {number} jsme právě odeslali.", { number: o.number }))) +
        track +
        p(esc(zas ? t("Až dorazí na výdejní místo, dá ti vědět Zásilkovna.") : t("Pošta ti ji doručí na adresu z objednávky."))) +
        cod +
        button(url, t("Zobrazit objednávku")) +
        contactLine(t),
    });
  }
  if (to === "cancelled") {
    const paid = o.paidAt != null;
    return done(ctx, subj(tk("Objednávka {number} je zrušená")), {
      preheader: t("Karty jsme vrátili do nabídky."),
      title: t("Objednávka je zrušená"),
      body:
        hello(t, o.name) +
        p(esc(t("objednávku {number} jsme zrušili.", { number: o.number }))) +
        (paid ? p(esc(t("Platbu {amount} ti vrátíme na účet, ze kterého přišla, nejpozději do 14 dní.", { amount: t.czk(o.totalHal) }))) : "") +
        p(esc(t("Pokud jde o omyl, ozvi se nám a domluvíme se."))) +
        contactLine(t),
    });
  }
  return null;
}

/** Upozornění pro obchod: nová objednávka (vždy česky). */
export function shopOrderCreated(site: string, o: Order, items: OrderItem[], t: T): Rendered {
  const body =
    p(`<strong>${esc(o.name)}</strong> · <a href="mailto:${esc(o.email)}" style="color:${C.ink}">${esc(o.email)}</a>${o.phone ? ` · ${esc(o.phone)}` : ""}`) +
    (o.note ? panel(`<strong>Poznámka zákazníka:</strong><br>${esc(o.note)}`, C.red) : "") +
    orderItemsBlock(t, o, items) +
    h2("Doručení a platba") +
    deliveryBlock(t, o) +
    (o.locale !== "cs" ? p(`Zákazník nakupoval v anglické verzi webu (${esc(o.locale)}).`, true) : "") +
    button(`${site}/admin/objednavky/${o.id}`, "Otevřít v administraci");
  return done({ t, site }, `Nová objednávka ${o.number} · ${t.czk(o.totalHal)}`, {
    preheader: `${o.name}, ${SHIPPING.find((x) => x.id === o.shippingMethod)?.title ?? o.shippingMethod}, ${t.czk(o.totalHal)}`,
    title: `Nová objednávka ${o.number}`,
    body,
  });
}

// ---------- Výkup ----------

function buybackLines(t: T, items: BuybackLine[], key: "estimateHal" | "finalHal") {
  return lines(
    items.map((i) => {
      const v = i[key];
      return { title: i.name, meta: `${i.set} ${i.number} · ${i.quantity} ${t("ks")}`, amount: v ? esc(t.czk(v)) : esc(t("bulk")) };
    }),
  );
}

export function buybackCreated(ctx: Ctx, r: Buyback, items: BuybackLine[]): Rendered {
  const { t, site } = ctx;
  const validTo = t.date(r.estimateValidTo);
  const body =
    hello(t, r.name) +
    p(esc(t("díky, výkup máme zapsaný. Tady je nezávazný odhad a jak nám karty poslat."))) +
    panel(
      rows([
        [t("Číslo výkupu"), `<strong style="font-family:Consolas,Menlo,monospace">${esc(r.number)}</strong>`],
        [t("Nezávazný odhad"), money(t, r.estimateHal, true)],
        [t("Způsob výplaty"), esc(r.payout === "credit" ? t("Kredit") : t("Peníze"))],
        [t("Odhad platí do"), esc(validTo)],
      ]),
    ) +
    h2(t("Jak nám karty poslat")) +
    steps([
      [t("Zabal karty"), t("Každou do obalu, dražší i do toploaderu. Celé do pevné obálky nebo krabičky.")],
      [t("Přilož číslo výkupu"), t("Na lísteček napiš {number}, ať karty hned spárujeme.", { number: r.number })],
      [t("Pošli nebo přines"), SHOP.buybackAddress],
    ]) +
    p(
      esc(
        r.payout === "credit"
          ? t("Po doručení karty zkontrolujeme. Když stav sedí, připíšeme kredit. Když ne, napíšeme ti protinabídku, nebo ti karty vrátíme.")
          : t("Po doručení karty zkontrolujeme. Když stav sedí, pošleme peníze na účet. Když ne, napíšeme ti protinabídku, nebo ti karty vrátíme."),
      ),
    ) +
    h2(t("Karty k výkupu")) +
    buybackLines(t, items, "estimateHal") +
    (r.bulkCount > 0 ? p(esc(t("{n} ks posoudíme jako bulk, cenu za ně doplníme po kontrole.", { n: r.bulkCount })), true) : "") +
    button(`${site}/vykup/${r.id}`, t("Zobrazit výkup")) +
    contactLine(t);
  return done(ctx, t("Výkup {number}: jak nám poslat karty", { number: r.number }), {
    preheader: t("Nezávazný odhad {amount}, platí do {date}.", { amount: t.czk(r.estimateHal), date: validTo }),
    title: t("Výkup máme zapsaný"),
    body,
  });
}

export function buybackStatus(ctx: Ctx, r: Buyback, to: Buyback["status"], items: BuybackLine[]): Rendered | null {
  const { t, site } = ctx;
  const url = `${site}/vykup/${r.id}`;
  const offer = r.offerHal ?? r.estimateHal;
  const credit = r.payout === "credit";
  const subj = (s: string) => t(s, { number: r.number });
  const wrap = (subject: string, title: string, preheader: string, inner: string) =>
    done(ctx, subj(subject), { title: t(title), preheader, body: hello(t, r.name) + inner + button(url, t("Zobrazit výkup")) + contactLine(t) });

  switch (to) {
    case "received":
      return wrap(tk("Karty k výkupu {number} dorazily"), tk("Karty dorazily"), t("Teď je zkontrolujeme."), p(esc(t("karty k výkupu {number} k nám dorazily. Teď je pečlivě zkontrolujeme a ozveme se s přesnou nabídkou.", { number: r.number }))));
    case "approved":
      return wrap(
        tk("Výkup {number} je schválený"),
        tk("Výkup je schválený"),
        t("Výkupní cena {amount}.", { amount: t.czk(offer) }),
        p(esc(t("karty jsme zkontrolovali a výkup {number} je schválený.", { number: r.number }))) +
          panel(rows([[t("Výkupní cena"), money(t, offer, true)], [t("Způsob výplaty"), esc(credit ? t("Kredit") : t("Peníze"))]])) +
          p(esc(credit ? t("Kredit ti připíšeme v nejbližších dnech, dáme ti vědět e-mailem.") : t("Peníze ti pošleme na účet v nejbližších dnech, dáme ti vědět e-mailem."))) +
          buybackLines(t, items, "finalHal"),
      );
    case "counter_offer":
      return wrap(
        tk("Výkup {number}: máme pro tebe novou nabídku"),
        tk("Nová nabídka k výkupu"),
        t("Nabízíme {amount}.", { amount: t.czk(offer) }),
        p(esc(t("při kontrole jsme u některých karet narazili na jiný stav, než byl v odhadu. Proto ti posíláme novou nabídku."))) +
          panel(rows([[t("Původní odhad"), esc(t.czk(r.estimateHal))], [t("Nová nabídka"), money(t, offer, true)]]), C.red) +
          buybackLines(t, items, "finalHal") +
          p(`<strong>${esc(t("Odpověz prosím na tento e-mail, jestli s nabídkou souhlasíš, nebo chceš karty poslat zpátky."))}</strong>`),
      );
    case "paid":
      return wrap(
        credit ? tk("Kredit za výkup {number} je připsaný") : tk("Peníze za výkup {number} jsou na cestě"),
        credit ? tk("Kredit je připsaný") : tk("Peníze jsou na cestě"),
        t("Částka {amount}.", { amount: t.czk(offer) }),
        p(
          esc(
            credit
              ? t("kredit {amount} za výkup {number} je připsaný k tvému e-mailu. Při další objednávce nám napiš a odečteme ho z ceny.", { amount: t.czk(offer), number: r.number })
              : t("peníze {amount} za výkup {number} jsme poslali na tvůj účet. Na účtu by měly být do dvou pracovních dnů.", { amount: t.czk(offer), number: r.number }),
          ),
        ) + p(esc(t("Díky za důvěru a za karty!"))),
      );
    case "returned":
      return wrap(tk("Karty z výkupu {number} posíláme zpět"), tk("Karty posíláme zpět"), t("Brzy je budeš mít doma."), p(esc(t("karty z výkupu {number} ti posíláme zpátky. Kdyby něco, ozvi se.", { number: r.number }))));
    case "cancelled":
      return wrap(tk("Výkup {number} je zrušený"), tk("Výkup je zrušený"), t("Výkup jsme zrušili."), p(esc(t("výkup {number} jsme zrušili. Pokud jde o omyl, stačí odpovědět na tento e-mail.", { number: r.number }))));
    default:
      return null;
  }
}

export function shopBuybackCreated(site: string, r: Buyback, items: BuybackLine[], t: T): Rendered {
  const body =
    p(`${esc(r.name ?? "")} <a href="mailto:${esc(r.email)}" style="color:${C.ink}">${esc(r.email)}</a>`) +
    panel(
      rows([
        ["Odhad", esc(t.czk(r.estimateHal))],
        ["Výplata", r.payout === "credit" ? "kredit" : `na účet ${esc(r.bankAccount ?? "")}`],
        ["Bulk", `${r.bulkCount} ks`],
      ]),
    ) +
    buybackLines(t, items, "estimateHal") +
    button(`${site}/admin/vykupy/${r.id}`, "Otevřít v administraci");
  return done({ t, site }, `Nový výkup ${r.number} · ${t.czk(r.estimateHal)}`, { preheader: `${r.email}, ${items.length} karet`, title: `Nový výkup ${r.number}`, body });
}

// ---------- Hlídání karty ----------

export type WatchMail = { token: string; cardName: string; set: string; number: string; slug: string; image: string | null; maxPriceHal: number | null };

export function watchConfirm(ctx: Ctx, w: WatchMail): Rendered {
  const { t, site } = ctx;
  const what = w.maxPriceHal
    ? t("Pošleme ti e-mail, až bude {name} skladem za {amount} nebo méně.", { name: w.cardName, amount: t.czk(w.maxPriceHal) })
    : t("Pošleme ti e-mail, až bude {name} zase skladem.", { name: w.cardName });
  return done(
    ctx,
    t("Potvrď hlídání karty {name}", { name: w.cardName }),
    {
      preheader: what,
      title: t("Potvrď hlídání karty"),
      body:
        p(esc(t("Ahoj,"))) +
        p(`${esc(what)}`) +
        panel(`<strong>${esc(w.cardName)}</strong><br><span style="color:${C.muted}">${esc(`${w.set} ${w.number}`)}</span>`) +
        p(esc(t("Aby nikdo nemohl přihlásit cizí e-mail, potvrď prosím hlídání tlačítkem:"))) +
        button(`${site}/hlidani/${w.token}`, t("Potvrdit hlídání")),
      footerNote: esc(t("Pokud o hlídání nevíš, e-mail klidně ignoruj. Bez potvrzení ti nic dalšího nepošleme.")),
    },
  );
}

export function watchAlert(ctx: Ctx, w: WatchMail, priceHal: number): Rendered {
  const { t, site } = ctx;
  const stop = `${site}/hlidani/${w.token}`;
  const img = w.image
    ? `<td width="110" style="padding-right:16px;vertical-align:top"><img src="${esc(w.image.startsWith("http") ? w.image : site + w.image)}" width="100" alt="${esc(w.cardName)}" style="display:block;border:0;border-radius:6px"></td>`
    : "";
  const title = w.maxPriceHal ? t("Cena klesla!") : t("Je zpátky skladem!");
  return done(ctx, w.maxPriceHal ? t("{name} je teď za {amount}", { name: w.cardName, amount: t.czk(priceHal) }) : t("{name} je zase skladem", { name: w.cardName }), {
    preheader: t("{name} od {amount}. Kusů bývá málo, tak neváhej.", { name: w.cardName, amount: t.czk(priceHal) }),
    title,
    body:
      p(esc(t("Ahoj,"))) +
      p(esc(w.maxPriceHal ? t("karta, kterou hlídáš, je teď za cenu, na kterou čekáš.") : t("karta, kterou hlídáš, je zase skladem."))) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px"><tr>${img}<td style="vertical-align:top;font:15px/21px Arial,sans-serif;color:${C.ink}">` +
      `<strong style="font-size:18px">${esc(w.cardName)}</strong><br><span style="color:${C.muted}">${esc(`${w.set} ${w.number}`)}</span><br><br>` +
      `${esc(t("od"))} <strong style="font-size:22px">${money(t, priceHal)}</strong></td></tr></table>` +
      button(`${site}/karta/${encodeURIComponent(w.slug)}`, t("Zobrazit kartu")) +
      p(esc(t("Kusů bývá málo, kdo dřív přijde, ten dřív sbírá.")), true),
    footerNote: `${esc(t("Hlídání ti zůstává zapnuté. Další e-mail pošleme, jen když cena ještě klesne nebo se karta vrátí na sklad."))} <a href="${esc(stop)}" style="color:${C.ink}">${esc(t("Zrušit hlídání"))}</a>`,
  });
}
