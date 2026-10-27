// QR platba (formát SPAYD, „QR Platba“ České bankovní asociace) a převod čísla účtu na IBAN.

/** "19-2000145399/0800" → "CZ6508000000192000145399"; null, když číslo účtu nedává smysl. */
export function czAccountToIban(account: string): string | null {
  const m = account.replace(/\s/g, "").match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!m) return null;
  const [, prefix = "", number, bank] = m;
  const bban = bank + prefix.padStart(6, "0") + number.padStart(10, "0");
  // IBAN kontrolní součet: BBAN + "CZ00" (C=12, Z=35) mod 97
  const numeric = bban + "123500";
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  const check = String(98 - rem).padStart(2, "0");
  return `CZ${check}${bban}`;
}

export function isValidIban(iban: string) {
  const s = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

/** SPAYD řetězec pro QR kód. Částka v haléřích. */
export function spayd({ iban, amountHal, vs, message }: { iban: string; amountHal: number; vs: string; message?: string }) {
  const clean = (t: string) =>
    t
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[*]/g, " ")
      .slice(0, 60);
  const parts = [
    "SPD*1.0",
    `ACC:${iban.replace(/\s/g, "").toUpperCase()}`,
    `AM:${(amountHal / 100).toFixed(2)}`,
    "CC:CZK",
    `X-VS:${vs}`,
  ];
  if (message) parts.push(`MSG:${clean(message)}`);
  return parts.join("*");
}

/** IBAN po čtveřicích pro zobrazení. */
export const formatIban = (iban: string) => iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
