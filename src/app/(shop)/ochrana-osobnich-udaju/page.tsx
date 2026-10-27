import type { Metadata } from "next";
import { LegalPage, Operator, Ph } from "@/components/legal";
import { SHOP } from "@/config/shop";

export const metadata: Metadata = { title: "Ochrana osobních údajů" };

export default function OchranaUdajuPage() {
  return (
    <LegalPage title="Ochrana osobních údajů" updated="[DATUM SPUŠTĚNÍ]">
      <h2>Kdo údaje zpracovává</h2>
      <p>
        Správcem osobních údajů je <Operator />. S dotazy k osobním údajům piš na {SHOP.email}.
      </p>

      <h2>Jaké údaje, proč a jak dlouho</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Účel</th>
            <th scope="col">Údaje</th>
            <th scope="col">Právní důvod</th>
            <th scope="col">Jak dlouho</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vyřízení objednávky a doručení</td>
            <td>jméno, e-mail, telefon, adresa nebo výdejní místo, IČO u firem</td>
            <td>plnění smlouvy</td>
            <td>po dobu vyřízení a záruky</td>
          </tr>
          <tr>
            <td>Výkup karet a výplata</td>
            <td>e-mail, jméno, číslo účtu</td>
            <td>plnění smlouvy</td>
            <td>po dobu vyřízení výkupu</td>
          </tr>
          <tr>
            <td>Účetnictví a daně</td>
            <td>údaje na dokladech</td>
            <td>právní povinnost</td>
            <td>
              <Ph>[10 let]</Ph> podle účetních a daňových předpisů
            </td>
          </tr>
          <tr>
            <td>Obrana a vymáhání nároků</td>
            <td>údaje k objednávce nebo výkupu</td>
            <td>oprávněný zájem</td>
            <td>po dobu promlčecí lhůty</td>
          </tr>
        </tbody>
      </table>
      <p>Údaje nepoužíváme k automatizovanému rozhodování ani profilování. Obchodní sdělení posíláme jen se souhlasem, který můžeš kdykoli odvolat.</p>

      <h2>Komu údaje předáváme</h2>
      <ul>
        <li>Dopravcům (Zásilkovna, Česká pošta) v rozsahu potřebném k doručení.</li>
        <li>Poskytovatelům, kteří pro nás provozují e-shop: hosting Vercel a databáze Neon. Údaje mohou být uložené i mimo EU na základě standardních smluvních doložek.</li>
        <li>
          Platební bráně <Ph>[NÁZEV BRÁNY]</Ph>, jakmile spustíme platbu kartou, a účetní <Ph>[ÚČETNÍ / KANCELÁŘ]</Ph>.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Používáme jen nezbytnou cookie <code>pl_cart</code>, která si pamatuje obsah košíku (které karty a kolik kusů) po dobu 30 dnů. Bez ní by košík nefungoval, proto na ni
        nepotřebujeme souhlas. Analytické ani reklamní cookies nepoužíváme.
      </p>

      <h2>Tvoje práva</h2>
      <p>
        Máš právo na přístup ke svým údajům, jejich opravu nebo výmaz, omezení zpracování, přenositelnost a právo vznést námitku proti zpracování z oprávněného zájmu. Stačí
        napsat na {SHOP.email}. Stížnost můžeš podat u Úřadu pro ochranu osobních údajů (<a href="https://uoou.gov.cz">uoou.gov.cz</a>).
      </p>
    </LegalPage>
  );
}
