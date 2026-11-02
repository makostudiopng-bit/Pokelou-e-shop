import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Operator, Ph } from "@/components/legal";
import { SHOP } from "@/config/shop";
import { DEFAULT_RULES } from "@/lib/pricing";

export const metadata: Metadata = { title: "Podmínky výkupu" };

export default function VykupPodminkyPage() {
  return (
    <LegalPage title="Podmínky výkupu" updated="[DATUM SPUŠTĚNÍ]">
      <p>
        Karty od tebe vykupuje <Operator />. Odesláním výkupního formuláře s těmito podmínkami souhlasíš.
      </p>

      <h2>Kdo může karty prodat</h2>
      <ul>
        <li>Výkup je jen pro plnoleté. Pokud ti ještě není 18, výkup za tebe musí odeslat rodič nebo zákonný zástupce.</li>
        <li>Prodávat můžeš jen karty, které ti patří.</li>
        <li>Padělky nevykupujeme. Když nějakou kartu za pravou nepovažujeme, vrátíme ti ji.</li>
      </ul>

      <h2>Odhad a konečná cena</h2>
      <ul>
        <li>
          Odhad ve formuláři je <strong>nezávazný</strong>. Vychází z nejnižší aktuální nabídky na Cardmarketu (cena „low“), stavu a jazyka karty. Za peníze
          vykupujeme za {DEFAULT_RULES.buybackCashPct} % této ceny, za kredit do e-shopu za {DEFAULT_RULES.buybackCreditPct} %. U některých edic a karet může být sazba
          jiná, formulář s tím počítá.
        </li>
        <li>Odhad platí 7 dní od odeslání formuláře. Karty nám v té době pošli nebo přines.</li>
        <li>
          Karty s odhadem pod {DEFAULT_RULES.buybackMinHal / 100} Kč za kus bereme jen hromadně jako bulk za <Ph>[CENA ZA BULK]</Ph>.
        </li>
        <li>
          Přesnou nabídku dostaneš až po fyzické kontrole karet u nás. Když stav sedí, platí odhad. Když se liší od toho, co jsi zadal(a), pošleme ti novou nabídku a
          je na tobě, jestli ji přijmeš, nebo ti karty vrátíme.
        </li>
      </ul>

      <h2>Jak výkup probíhá</h2>
      <ol>
        <li>Odešleš formulář a dostaneš číslo výkupu.</li>
        <li>
          Karty zabalíš (každou do obalu, dražší do toploaderu), přiložíš lísteček s číslem výkupu a pošleš je na adresu <Ph>{SHOP.buybackAddress}</Ph>, nebo je přineseš
          osobně. Poštovné hradíš ty.
        </li>
        <li>Do <Ph>[5 pracovních dnů]</Ph> od doručení karty zkontrolujeme.</li>
        <li>
          Když cena sedí, pošleme peníze na účet do <Ph>[3 pracovních dnů]</Ph>, nebo hned připíšeme kredit. Když nesouhlasíš s protinabídkou, karty ti vrátíme. Zpáteční poštovné{" "}
          <Ph>[hradí zákazník / hradíme my]</Ph>.
        </li>
      </ol>

      <h2>Kredit</h2>
      <ul>
        <li>Kredit můžeš použít na nákup v e-shopu. Za peníze ho vyměnit nejde.</li>
        <li>
          Kredit platí <Ph>[24 měsíců od připsání]</Ph>.
        </li>
      </ul>

      <h2>Osobní údaje</h2>
      <p>
        K výkupu potřebujeme tvůj e-mail a při výplatě na účet číslo účtu. Jak s údaji zacházíme, popisují zásady <Link href="/ochrana-osobnich-udaju">ochrany osobních údajů</Link>.
      </p>
    </LegalPage>
  );
}
