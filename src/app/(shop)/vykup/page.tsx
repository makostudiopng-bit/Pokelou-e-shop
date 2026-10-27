import type { Metadata } from "next";
import { getDb, hasDb } from "@/db";
import { loadBuybackCards, searchDemoCards } from "@/lib/buyback";
import type { BuybackCard } from "@/lib/buyback-shared";
import { DEFAULT_RULES, resolveRules } from "@/lib/pricing";
import { ruleFromRow } from "@/lib/sync";
import * as s from "@/db/schema";
import { BuybackForm } from "./buyback-form";

export const metadata: Metadata = {
  title: "Výkup karet",
  description: "Spočítej si odhad výkupu Pokémon karet. Vykupujeme za peníze i za kredit do e-shopu, konečnou cenu potvrdíme po kontrole.",
};

const STEPS = ["Karty", "Odeslání", "Kontrola", "Výplata"];

export default async function VykupPage({ searchParams }: PageProps<"/vykup">) {
  const karta = (await searchParams).karta;
  const id = typeof karta === "string" ? karta.slice(0, 80) : null;

  let initial: BuybackCard[] = [];
  let rules = DEFAULT_RULES;
  if (hasDb()) {
    try {
      const db = await getDb();
      const global = (await db.select().from(s.pricingRules)).find((r) => r.scope === "global");
      rules = resolveRules(ruleFromRow(global));
      if (id) initial = await loadBuybackCards(db, [id]);
    } catch (e) {
      console.error("Výkup: databáze nedostupná", e);
    }
  } else if (id) {
    initial = searchDemoCards("").filter((c) => c.id === id);
  }

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-8 pb-16 sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="m-0 text-[40px] leading-[40px] font-extrabold sm:text-[48px] sm:leading-[48px]" style={{ fontFamily: "var(--font-display)" }}>
          Výkup karet
        </h1>
        <p className="m-0 max-w-[720px] text-[17px] leading-[26px]" style={{ color: "var(--ink-muted)" }}>
          Přidej karty, zvol stav a hned uvidíš odhad. Konečnou cenu potvrdíme po kontrole karet u nás. Odhad platí 7 dní.
        </p>
      </div>
      <ol aria-label="Jak výkup probíhá" className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm font-extrabold">
        {STEPS.map((st, i) => (
          <li
            key={st}
            aria-current={i === 0 ? "step" : undefined}
            className="rounded-full px-4 py-[7px]"
            style={i === 0 ? { background: "var(--surface-inverse)", color: "var(--ink-inverse)" } : { background: "var(--surface-200)", color: "var(--ink-muted)" }}
          >
            {i + 1} · {st}
          </li>
        ))}
      </ol>
      <BuybackForm initial={initial} minHal={rules.buybackMinHal} cashPct={rules.buybackCashPct} creditPct={rules.buybackCreditPct} />
    </main>
  );
}
