// Stavební kameny e-mailů v brandu PokeLou: krémové pozadí, bílá karta s černým rámečkem,
// černá hlavička se žlutou linkou, žluté tlačítko. Jen tabulky a styly přímo v HTML,
// protože e-mailové programy (Gmail, Outlook, Apple Mail) nic jiného spolehlivě neumí.
import { SHOP } from "@/config/shop";
import type { T } from "@/i18n/core";

export const C = {
  bg: "#f4eee6",
  card: "#ffffff",
  ink: "#141414",
  muted: "#5c564e",
  line: "#e2dacc",
  panel: "#faf6ef",
  yellow: "#f2a400",
  red: "#c42a14",
  green: "#1f7a4d",
};
const FONT = "Arial, Helvetica, sans-serif";
const HEAD = "'Arial Black', Arial, Helvetica, sans-serif";

/** Escapování pro HTML – všechno, co přijde od zákazníka nebo z databáze. */
export const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const p = (html: string, muted = false) =>
  `<p style="margin:0 0 14px;font:${muted ? "14px/21px" : "16px/24px"} ${FONT};color:${muted ? C.muted : C.ink}">${html}</p>`;

export const h2 = (text: string) => `<h2 style="margin:26px 0 10px;font:900 19px/24px ${HEAD};color:${C.ink}">${esc(text)}</h2>`;

export const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td style="background:${C.yellow};border:2px solid ${C.ink};border-radius:10px">` +
  `<a href="${esc(href)}" style="display:inline-block;padding:13px 22px;font:800 16px/20px ${FONT};color:${C.ink};text-decoration:none">${esc(label)} &rarr;</a></td></tr></table>`;

/** Zvýrazněný panel (platební údaje, souhrn). accent: barva levého proužku. */
export const panel = (html: string, accent = C.yellow) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:${C.panel};border:1px solid ${C.line};border-left:5px solid ${accent};border-radius:10px"><tr><td style="padding:16px 18px">${html}</td></tr></table>`;

/** Dvojice popisek – hodnota. Hodnoty jsou už hotové HTML (escapované volajícím). */
export const rows = (items: [string, string][], opts: { strongLast?: boolean } = {}) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:15px/21px ${FONT};color:${C.ink}">` +
  items
    .map(([k, v], i) => {
      const last = opts.strongLast && i === items.length - 1;
      const top = last ? `border-top:2px solid ${C.ink};padding-top:10px;` : "";
      return `<tr><td style="${top}padding:4px 12px 4px 0;color:${last ? C.ink : C.muted};${last ? "font-weight:800;" : ""}vertical-align:top">${esc(k)}</td><td align="right" style="${top}padding:4px 0;font-weight:${last ? 900 : 700};${last ? "font-size:18px;" : ""}vertical-align:top">${v}</td></tr>`;
    })
    .join("") +
  `</table>`;

/** Seznam karet: název, drobný popis pod ním, cena vpravo. */
export const lines = (items: { title: string; meta: string; amount: string }[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:15px/20px ${FONT};color:${C.ink};margin-bottom:8px">` +
  items
    .map(
      (l) =>
        `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid ${C.line}"><strong>${esc(l.title)}</strong><br><span style="font-size:13px;color:${C.muted}">${esc(l.meta)}</span></td>` +
        `<td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};white-space:nowrap;font-weight:700;vertical-align:top">${l.amount}</td></tr>`,
    )
    .join("") +
  `</table>`;

/** Očíslované kroky „co bude dál“. */
export const steps = (items: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:15px/21px ${FONT};color:${C.ink}">` +
  items
    .map(
      ([title, text], i) =>
        `<tr><td width="34" style="padding:6px 10px 6px 0;vertical-align:top"><span style="display:inline-block;width:26px;height:26px;border-radius:13px;background:${C.yellow};border:2px solid ${C.ink};font:900 13px/26px ${FONT};text-align:center">${i + 1}</span></td>` +
        `<td style="padding:6px 0;vertical-align:top"><strong>${esc(title)}</strong><br><span style="color:${C.muted}">${esc(text)}</span></td></tr>`,
    )
    .join("") +
  `</table>`;

export function layout(o: {
  t: T;
  site: string;
  /** krátký text, který se ukáže v seznamu e-mailů vedle předmětu */
  preheader: string;
  title: string;
  body: string;
  /** proč e-mail přišel, případně odkaz na odhlášení */
  footerNote?: string;
}) {
  const { t, site } = o;
  const lang = t.locale === "cs" ? "cs" : "en";
  const operator = [SHOP.operator, SHOP.ico && !SHOP.ico.startsWith("[") ? `${t("IČO")} ${SHOP.ico}` : ""].filter((x) => x && !x.startsWith("[")).join(" · ");
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.card};border:3px solid ${C.ink};border-radius:18px;overflow:hidden">
<tr><td style="background:${C.ink};border-bottom:5px solid ${C.yellow};padding:14px 24px">
<a href="${esc(site)}" style="text-decoration:none"><img src="${esc(site)}/brand/logo-email.png" width="72" height="72" alt="PokeLou" style="display:block;border:0"></a>
</td></tr>
<tr><td style="padding:26px 24px 10px">
<h1 style="margin:0 0 16px;font:900 26px/31px ${HEAD};color:${C.ink}">${esc(o.title)}</h1>
${o.body}
</td></tr>
<tr><td style="padding:16px 24px 22px;border-top:1px solid ${C.line};font:13px/19px ${FONT};color:${C.muted}">
${o.footerNote ? `${o.footerNote}<br><br>` : ""}<strong style="color:${C.ink}">PokeLou</strong> · <a href="${esc(site)}" style="color:${C.ink}">${esc(SHOP.web)}</a> · <a href="mailto:${esc(SHOP.email)}" style="color:${C.ink}">${esc(SHOP.email)}</a> · <a href="${esc(SHOP.instagramUrl)}" style="color:${C.ink}">Instagram ${esc(SHOP.instagram)}</a>${operator ? `<br>${esc(operator)}` : ""}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Textová verze z HTML: pro programy bez HTML a pro lepší doručitelnost. */
export function toText(html: string) {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<div style="display:none[\s\S]*?<\/div>/i, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const l = label.replace(/<[^>]+>/g, "").trim();
      return l.includes("@") || href.startsWith("mailto:") ? l : `${l} (${href})`;
    })
    .replace(/<img [^>]*alt="([^"]*)"[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|tr|table)>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&rarr;/g, "→")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
