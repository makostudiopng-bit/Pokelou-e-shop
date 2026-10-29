// Úvodní stránka: pozvánka do výkupu jako „výkupní lístek“ s ukázkovým odhadem.
// Čísla počítá stejná funkce jako formulář výkupu, takže sedí s tím, co zákazník uvidí.
import Image from "next/image";
import Link from "next/link";
import { getDb, hasDb } from "@/db";
import { loadBuybackCards, searchDemoCards } from "@/lib/buyback";
import { estimateItem, type BuybackCard } from "@/lib/buyback-shared";
import { formatCzk } from "@/lib/pricing";

const SAMPLE_ID = "sv01-245"; // Gardevoir ex 245/198

async function sampleCard(): Promise<BuybackCard | null> {
  try {
    if (hasDb()) return (await loadBuybackCards(await getDb(), [SAMPLE_ID]))[0] ?? null;
    return searchDemoCards("Gardevoir ex 245")[0] ?? null;
  } catch {
    return null;
  }
}

export async function BuybackBanner() {
  const card = await sampleCard();
  const item = { condition: "NM" as const, language: "EN", quantity: 1 };
  const cash = card && estimateItem(card, item, "cash");
  const credit = card && estimateItem(card, item, "credit");
  const showTicket = card && cash && credit && !cash.rejected && !credit.rejected && credit.totalHal > cash.totalHal;

  return (
    <section aria-labelledby="sell-h" className="mx-auto mb-16 max-w-[1280px] px-4 sm:px-6">
      <div className="pl-sell relative grid items-center gap-10 overflow-hidden rounded-[24px] border-[3px] px-6 py-10 sm:px-12 sm:py-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative z-[1] flex flex-col items-start gap-4">
          <span className="pl-sell__kicker">Výkup karet</span>
          <h2 id="sell-h" className="m-0 text-[44px] leading-[44px] font-extrabold sm:text-[56px] sm:leading-[54px]" style={{ fontFamily: "var(--font-display)" }}>
            Máš doma karty,
            <br />
            které nehraješ?
          </h2>
          <p className="m-0 max-w-[460px] text-[17px] leading-[26px]">
            Spočítej si odhad výkupu za minutu. Za kredit do e-shopu dostaneš víc.
          </p>
          <Link href="/vykup" className="pl-cta-dark mt-2 inline-flex items-center gap-3 rounded-xl border-2 py-2.5 pr-2.5 pl-6 text-[17px] font-extrabold no-underline">
            Spočítat výkup
            <span className="pl-cta-dark__arrow grid h-8 w-8 place-items-center rounded-lg" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        </div>

        {showTicket && (
          <div className="pl-sell__visual relative z-[1] mx-auto flex w-full max-w-[460px] items-center justify-center">
            {card.image && (
              <div className="pl-holo-card pl-sell__card">
                <Image src={card.image} alt="" width={600} height={825} sizes="180px" className="h-full w-full object-cover" />
              </div>
            )}
            <figure className="pl-ticket m-0" aria-label={`Příklad odhadu výkupu: ${card.name}`}>
              <figcaption className="pl-ticket__head">
                <span>Příklad odhadu</span>
                <span className="font-mono">NM · EN</span>
              </figcaption>
              <strong className="block text-[19px] leading-[24px]">{card.name}</strong>
              <span className="pl-note">
                {card.set} · {card.number}
              </span>
              <dl className="pl-ticket__rows">
                <div>
                  <dt>Na účet (peníze)</dt>
                  <dd>{formatCzk(cash.totalHal)}</dd>
                </div>
                <div className="pl-ticket__best">
                  <dt>Kreditem</dt>
                  <dd>{formatCzk(credit.totalHal)}</dd>
                </div>
              </dl>
              <span className="pl-ticket__bonus">+{formatCzk(credit.totalHal - cash.totalHal)} navíc za kredit</span>
            </figure>
          </div>
        )}
      </div>
    </section>
  );
}
