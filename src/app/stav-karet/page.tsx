import type { Metadata } from "next";
import Link from "next/link";
import { ConditionBadge } from "@/components/ui";
import type { Condition } from "@/db/schema";

export const metadata: Metadata = {
  title: "Jak hodnotíme stav karet – PokeLou",
  description: "Stupnice stavu karet od Mint po Poor: co znamená a jak se promítne do ceny.",
};

// Texty k odsouhlasení s klientem (stupnice odpovídá Cardmarketu).
const GRADES: { c: Condition; text: string }[] = [
  { c: "M", text: "Jako z balíčku. Žádné stopy po hraní ani po manipulaci, ostré rohy, čistý povrch." },
  { c: "NM", text: "Skoro jako nová. Nejvýš drobnost viditelná jen zblízka, třeba nepatrná bílá tečka na hraně." },
  { c: "EX", text: "Pár drobných stop: lehce obroušené hrany nebo rohy, jemné škrábance na lesklé straně." },
  { c: "GD", text: "Znatelné stopy po hraní na hranách i povrchu, karta je ale rovná a bez ohybů." },
  { c: "LP", text: "Výrazné obroušení, škrábance nebo lehce zvlněná karta. Pořád pěkná do sbírky i do balíčku." },
  { c: "PL", text: "Silně ohraná: ohyby, odřené rohy, skvrny. Vhodná hlavně na hraní." },
  { c: "PO", text: "Poškozená: trhliny, výrazné ohyby, popisky nebo voda. Bereme jen vybrané karty." },
];

export default function StavKaretPage() {
  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 pt-6 pb-14 sm:px-6">
      <h1 className="m-0 text-[38px] leading-[40px] font-extrabold sm:text-[48px] sm:leading-[48px]" style={{ fontFamily: "var(--font-display)" }}>
        Jak hodnotíme stav
      </h1>
      <p className="m-0 text-[17px] leading-[26px]">
        Každou kartu prohlédneme pod světlem z obou stran a zařadíme podle stupnice, kterou používá i Cardmarket. Když si nejsme
        jistí, dáme horší stupeň – ať tě nic nepřekvapí.
      </p>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {GRADES.map(({ c, text }) => (
          <li key={c} className="flex flex-wrap items-start gap-x-5 gap-y-2 rounded-[10px] px-5 py-4" style={{ background: "var(--surface-100)", border: "1px solid var(--line)" }}>
            <span className="w-[150px] flex-none pt-0.5">
              <ConditionBadge condition={c} long />
            </span>
            <span className="min-w-0 flex-[1_1_300px] text-[15px] leading-[22px]">{text}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 text-[15px] leading-[22px]" style={{ color: "var(--ink-muted)" }}>
        U výkupu platí stejná stupnice. Odhad z formuláře počítá se stavem, který zadáš, a konečnou cenu potvrdíme po prohlídce.{" "}
        <Link href="/vykup">Jak funguje výkup</Link>
      </p>
    </main>
  );
}
