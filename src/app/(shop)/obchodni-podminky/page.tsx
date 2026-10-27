import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Operator, Ph } from "@/components/legal";
import { SHOP } from "@/config/shop";

export const metadata: Metadata = { title: "Obchodní podmínky" };

export default function ObchodniPodminkyPage() {
  return (
    <LegalPage title="Obchodní podmínky" updated="[DATUM SPUŠTĚNÍ]">
      <h2>1. Kdo prodává</h2>
      <p>
        E-shop {SHOP.web} provozuje <Operator />. Tyto podmínky upravují nákup karet přes e-shop. Pro výkup karet od zákazníků platí samostatné{" "}
        <Link href="/vykup-podminky">podmínky výkupu</Link>.
      </p>
      <p>
        Spotřebitelem je každý, kdo nakupuje mimo svou podnikatelskou činnost. Pokud nakupuješ jako podnikatel (s IČO), některá spotřebitelská práva,
        hlavně odstoupení do 14 dnů, se na tebe nevztahují.
      </p>

      <h2>2. Objednávka a uzavření smlouvy</h2>
      <ul>
        <li>Nabídka na webu platí, dokud je karta skladem. Každý kus je na skladě v počtu, který u něj vidíš.</li>
        <li>Odesláním objednávky v pokladně ji závazně objednáváš. Smlouva vzniká jejím přijetím, které ti potvrdíme na e-mail.</li>
        <li>Před odesláním můžeš objednávku kdykoli upravit v košíku a v pokladně.</li>
        <li>Když se karta mezitím prodá nebo se objeví zjevná chyba v ceně, ozveme se ti a objednávku s tebou upravíme nebo zrušíme.</li>
      </ul>

      <h2>3. Ceny a platba</h2>
      <ul>
        <li>Ceny jsou konečné v Kč{SHOP.vatPayer == null ? <> <Ph>[včetně DPH / provozovatel není plátcem DPH]</Ph></> : SHOP.vatPayer ? " včetně DPH" : ". Provozovatel není plátcem DPH"}. Cena dopravy a případný příplatek za dobírku se ukážou v pokladně před odesláním.</li>
        <li>
          Zaplatit můžeš bankovním převodem (QR kód dostaneš po objednávce), na dobírku, nebo kartou online, jakmile ji spustíme. Převodem zaplať do{" "}
          <Ph>[7]</Ph> dnů, jinak objednávku zrušíme a karty vrátíme do prodeje.
        </li>
        <li>Kredit z výkupu se odečte z ceny objednávky a nelze ho vyměnit za peníze.</li>
        <li>Doklad o koupi ti pošleme e-mailem.</li>
      </ul>

      <h2>4. Dodání</h2>
      <p>
        Možnosti a ceny dopravy najdeš na stránce <Link href="/doprava-a-platba">Doprava a platba</Link>. Zaplacené objednávky (dobírky hned po objednání) odesíláme
        do <Ph>[2 pracovních dnů]</Ph>. Karty balíme do obalu a toploaderu, celou zásilku do pevné obálky. Nebezpečí poškození přechází na tebe převzetím zásilky.
        Když zásilka dorazí poškozená, sepiš to prosím s dopravcem a dej nám vědět.
      </p>

      <h2>5. Stav karet</h2>
      <p>
        Prodáváme jednotlivé sběratelské karty. U každé uvádíme stav podle naší stupnice (Mint až Poor), kterou popisuje <Link href="/stav-karet">průvodce stavem karet</Link>,
        a jazyk. U dražších karet je na fotce konkrétní kus, u levnějších může jít o ilustrační foto. Opotřebení odpovídající uvedenému stavu není vada.
      </p>

      <h2>6. Odstoupení od smlouvy do 14 dnů</h2>
      <ul>
        <li>Jako spotřebitel můžeš od smlouvy bez udání důvodu odstoupit do 14 dnů od převzetí zásilky. Stačí poslat e-mail na {SHOP.email} s číslem objednávky.</li>
        <li>Karty nám pošli zpátky nejpozději do 14 dnů od odstoupení. Náklady na vrácení neseš ty.</li>
        <li>
          Peníze vrátíme do 14 dnů od odstoupení, včetně ceny nejlevnější nabízené dopravy, stejným způsobem, jakým jsi platil(a). Můžeme počkat, než nám karty
          dorazí.
        </li>
        <li>Karty vracej ve stavu, v jakém přišly. Pokud se jejich stav zhorší (ohyb, poškrábání), můžeme peníze snížit o odpovídající částku.</li>
      </ul>

      <h2>7. Reklamace</h2>
      <p>
        Práva z vadného plnění a postup reklamace popisuje <Link href="/reklamace">reklamační řád</Link>.
      </p>

      <h2>8. Spory</h2>
      <p>
        Spor se spotřebitelem, který se nám nepodaří vyřešit dohodou, může řešit mimosoudně Česká obchodní inspekce (<a href="https://www.coi.cz">www.coi.cz</a>).
        Dohled nad dodržováním předpisů na ochranu spotřebitele vykonává také ČOI.
      </p>

      <h2>9. Závěrečná ustanovení</h2>
      <p>
        Smlouva se řídí českým právem. Osobní údaje zpracováváme podle zásad <Link href="/ochrana-osobnich-udaju">ochrany osobních údajů</Link>. Podmínky můžeme měnit;
        pro tvou objednávku platí znění účinné v době jejího odeslání.
      </p>
    </LegalPage>
  );
}
