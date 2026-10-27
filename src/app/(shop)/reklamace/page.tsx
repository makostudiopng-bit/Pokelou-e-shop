import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Operator, Ph } from "@/components/legal";
import { SHOP } from "@/config/shop";

export const metadata: Metadata = { title: "Reklamace" };

export default function ReklamacePage() {
  return (
    <LegalPage title="Reklamace" updated="[DATUM SPUŠTĚNÍ]">
      <p>
        Reklamace vyřizuje <Operator />.
      </p>

      <h2>Co se dá reklamovat</h2>
      <ul>
        <li>Karta je v horším stavu, než jsme uvedli (například jsme psali Near Mint a karta má ohyb).</li>
        <li>Přišla jiná karta, jiný jazyk nebo jiné provedení, než jsi objednal(a).</li>
        <li>Karta není pravá.</li>
      </ul>
      <p>
        Opotřebení, které odpovídá uvedenému stavu (popis najdeš v <Link href="/stav-karet">průvodci stavem karet</Link>), ani poškození, které vzniklo až po převzetí,
        vadou není.
      </p>

      <h2>Do kdy</h2>
      <p>
        Vadu můžeš uplatnit do <Ph>[12]</Ph> měsíců od převzetí. Sběratelské karty prodáváme jako použité zboží, proto je lhůta zkrácená na 12 měsíců, jak zákon u použitých věcí
        umožňuje. Vady viditelné na první pohled (jiná karta, poškození při přepravě) nám prosím napiš co nejdřív po převzetí.
      </p>

      <h2>Jak reklamovat</h2>
      <ol>
        <li>Napiš na {SHOP.email} číslo objednávky, kterou kartu reklamuješ a co je s ní špatně. Pomůžou fotky z obou stran.</li>
        <li>Potvrdíme ti přijetí reklamace a pošleme adresu, kam kartu poslat. Zabal ji do obalu a toploaderu.</li>
        <li>Reklamaci vyřídíme nejpozději do 30 dnů od uplatnění a dáme ti vědět e-mailem.</li>
      </ol>

      <h2>Jak reklamaci vyřešíme</h2>
      <p>
        Když je reklamace oprávněná, pošleme ti stejnou kartu ve správném stavu, pokud ji máme. Jinak ti vrátíme peníze, nebo se dohodneme na slevě. Účelně vynaložené
        náklady na zaslání reklamované karty ti proplatíme.
      </p>

      <h2>Když se nedohodneme</h2>
      <p>
        Můžeš se obrátit na Českou obchodní inspekci, která řeší spotřebitelské spory mimosoudně: <a href="https://www.coi.cz">www.coi.cz</a>.
      </p>
    </LegalPage>
  );
}
