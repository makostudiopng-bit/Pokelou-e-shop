import type { Metadata } from "next";
import { LegalPage, Ph } from "@/components/legal";
import { cardPaymentEnabled, PAYMENT, SHIPPING, SHOP } from "@/config/shop";
import { formatCzk } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Doprava a platba",
  description: "Jak karty posíláme, kolik stojí doprava a jak můžeš zaplatit.",
};

const czk = (hal: number) => (hal === 0 ? "zdarma" : formatCzk(hal));

export default function DopravaAPlatbaPage() {
  return (
    <LegalPage title="Doprava a platba" updated="[DATUM SPUŠTĚNÍ]">
      <h2>Doprava</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Způsob</th>
            <th scope="col">Jak to funguje</th>
            <th scope="col" className="num">
              Cena
            </th>
          </tr>
        </thead>
        <tbody>
          {SHIPPING.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{s.title}</strong>
              </td>
              <td>{s.id === "pickup" ? <>Vyzvednutí na adrese <Ph>{SHOP.pickupAddress}</Ph>, až ti napíšeme, že je objednávka připravená.</> : s.note}</td>
              <td className="num">{czk(s.priceHal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Zaplacené objednávky odesíláme do <Ph>[2 pracovních dnů]</Ph>. Každou kartu balíme do obalu a toploaderu, celou zásilku do pevné obálky. Dražší zásilky
        posíláme pojištěné. Sledovací číslo ti pošleme e-mailem.
      </p>

      <h2>Platba</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Způsob</th>
            <th scope="col">Jak to funguje</th>
            <th scope="col" className="num">
              Příplatek
            </th>
          </tr>
        </thead>
        <tbody>
          {PAYMENT.filter((p) => p.id !== "card" || cardPaymentEnabled()).map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{p.title}</strong>
              </td>
              <td>
                {p.note}
                {p.id === "cod" && " Jen při doručení Zásilkovnou nebo poštou."}
              </td>
              <td className="num">{czk(p.feeHal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!cardPaymentEnabled() && <p>Platbu kartou online připravujeme.</p>}
      <p>Kredit z výkupu můžeš použít jako platbu za objednávku.</p>
    </LegalPage>
  );
}
