// Denní kurz ČNB (EUR/CZK). Textový formát:
//   15.10.2026 #200
//   země|měna|množství|kód|kurz
//   EMU|euro|1|EUR|24,335
const CNB_URL =
  "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt";

export type CnbRate = { day: string; eurCzk: number };

export function parseCnb(text: string, code = "EUR"): CnbRate {
  const lines = text.trim().split(/\r?\n/);
  const m = lines[0]?.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) throw new Error("ČNB: neznámý formát hlavičky");
  const day = `${m[3]}-${m[2]}-${m[1]}`;
  for (const line of lines.slice(2)) {
    const parts = line.split("|");
    if (parts[3] === code) {
      const amount = Number(parts[2]);
      const rate = Number(parts[4].replace(",", "."));
      if (!amount || !Number.isFinite(rate)) break;
      return { day, eurCzk: rate / amount };
    }
  }
  throw new Error(`ČNB: kurz ${code} nenalezen`);
}

export async function fetchCnbRate(): Promise<CnbRate> {
  const res = await fetch(CNB_URL);
  if (!res.ok) throw new Error(`ČNB: HTTP ${res.status}`);
  return parseCnb(await res.text());
}
