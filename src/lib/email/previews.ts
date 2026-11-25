// Náhledy všech e-mailů s ukázkovými daty (administrace › E-maily a testy).
import QRCode from "qrcode";
import { makeT, type Locale } from "@/i18n/core";
import { FALLBACK_EUR_CZK } from "@/lib/pricing";
import { spayd } from "@/lib/spayd";
import { sampleBuyback, sampleBuybackLines, sampleOrder, sampleOrderItems, sampleWatch } from "./samples";
import * as tpl from "./templates";

export const PREVIEWS = {
  order_created: "Objednávka přijata (převod)",
  order_created_cod: "Objednávka přijata (dobírka)",
  order_paid: "Platba dorazila",
  order_packed: "Připraveno k vyzvednutí",
  order_shipped: "Objednávka odeslána",
  order_cancelled: "Objednávka zrušena",
  buyback_created: "Výkup přijat",
  buyback_received: "Karty k výkupu dorazily",
  buyback_approved: "Výkup schválen",
  buyback_counter_offer: "Protinabídka k výkupu",
  buyback_paid: "Výkup vyplacen (peníze)",
  buyback_paid_credit: "Výkup vyplacen (kredit)",
  buyback_returned: "Karty vráceny",
  buyback_cancelled: "Výkup zrušen",
  watch_confirm: "Potvrzení hlídání",
  watch_alert_stock: "Hlídání: zase skladem",
  watch_alert_price: "Hlídání: cena klesla",
  shop_order: "Pro obchod: nová objednávka",
  shop_buyback: "Pro obchod: nový výkup",
} as const;
export type PreviewKey = keyof typeof PREVIEWS;
export const isPreviewKey = (k: unknown): k is PreviewKey => typeof k === "string" && k in PREVIEWS;

const SAMPLE_IBAN = "CZ6508000000192000145399";

export async function renderPreview(key: PreviewKey, locale: Locale, site: string, eurCzk = FALLBACK_EUR_CZK): Promise<tpl.Rendered> {
  const t = makeT(locale, eurCzk);
  const ctx = { t, site };
  const o = sampleOrder({ locale });
  const b = sampleBuyback({ locale });
  const cs = makeT("cs");
  switch (key) {
    case "order_created": {
      const png = await QRCode.toBuffer(spayd({ iban: SAMPLE_IBAN, amountHal: o.totalHal, vs: o.paymentRef ?? "", message: `PokeLou ${o.number}` }), { type: "png", width: 280, margin: 1 });
      return tpl.orderCreated(ctx, o, sampleOrderItems, { account: "19-2000145399/0800", iban: SAMPLE_IBAN, qrPng: png.toString("base64") });
    }
    case "order_created_cod":
      return tpl.orderCreated(ctx, sampleOrder({ locale, paymentMethod: "cod", codFeeHal: 39_00, totalHal: o.totalHal + 39_00, shippingMethod: "ceska_posta", shippingPoint: null, address: { street: "Dlouhá 12", city: "Praha", zip: "110 00" } }), sampleOrderItems, null);
    case "order_paid":
      return tpl.orderStatus(ctx, o, "paid")!;
    case "order_packed":
      return tpl.orderStatus(ctx, sampleOrder({ locale, shippingMethod: "pickup", shippingPoint: null, shippingHal: 0 }), "packed")!;
    case "order_shipped":
      return tpl.orderStatus(ctx, o, "shipped")!;
    case "order_cancelled":
      return tpl.orderStatus(ctx, sampleOrder({ locale, paidAt: new Date() }), "cancelled")!;
    case "buyback_created":
      return tpl.buybackCreated(ctx, b, sampleBuybackLines);
    case "buyback_received":
    case "buyback_approved":
    case "buyback_counter_offer":
    case "buyback_paid":
    case "buyback_returned":
    case "buyback_cancelled":
      return tpl.buybackStatus(ctx, b, key.replace("buyback_", "") as Parameters<typeof tpl.buybackStatus>[2], sampleBuybackLines)!;
    case "buyback_paid_credit":
      return tpl.buybackStatus(ctx, sampleBuyback({ locale, payout: "credit", bankAccount: null }), "paid", sampleBuybackLines)!;
    case "watch_confirm":
      return tpl.watchConfirm(ctx, sampleWatch(900_00));
    case "watch_alert_stock":
      return tpl.watchAlert(ctx, sampleWatch(null), 1190_00);
    case "watch_alert_price":
      return tpl.watchAlert(ctx, sampleWatch(900_00), 849_00);
    case "shop_order":
      return tpl.shopOrderCreated(site, o, sampleOrderItems, cs);
    case "shop_buyback":
      return tpl.shopBuybackCreated(site, b, sampleBuybackLines, cs);
  }
}

/** Pro náhled v prohlížeči: obrázky vložené přes cid: nahradí data URI. */
export function inlineAttachments(r: tpl.Rendered) {
  let html = r.html;
  for (const a of r.attachments ?? []) if (a.contentId) html = html.replaceAll(`cid:${a.contentId}`, `data:image/png;base64,${a.content}`);
  return html;
}
