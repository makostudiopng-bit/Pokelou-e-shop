import type { Metadata } from "next";
import { LegalPage, Ph } from "@/components/legal";
import { cardPaymentEnabled, PAYMENT, SHIPPING, SHOP } from "@/config/shop";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Doprava a platba"), description: t("Jak karty posíláme, kolik stojí doprava a jak můžeš zaplatit.") };
}

export default async function DopravaAPlatbaPage() {
  const t = await getT();
  const czk = (hal: number) => (hal === 0 ? t("zdarma") : t.price(hal));
  return (
    <LegalPage title={t("Doprava a platba")} updated="[DATUM SPUŠTĚNÍ]">
      <h2>{t("Doprava")}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("Způsob")}</th>
            <th scope="col">{t("Jak to funguje")}</th>
            <th scope="col" className="num">
              {t("Cena")}
            </th>
          </tr>
        </thead>
        <tbody>
          {SHIPPING.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{t(s.title)}</strong>
              </td>
              <td>{s.id === "pickup" ? <>{t("Vyzvednutí na adrese")} <Ph>{SHOP.pickupAddress}</Ph>, {t("až ti napíšeme, že je objednávka připravená.")}</> : t(s.note)}</td>
              <td className="num">{czk(s.priceHal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {t("Zaplacené objednávky odesíláme do")} <Ph>{t("[2 pracovních dnů]")}</Ph>. {t("Každou kartu balíme do obalu a toploaderu, celou zásilku do pevné obálky. Dražší zásilky posíláme pojištěné. Sledovací číslo ti pošleme e-mailem.")}
      </p>

      <h2>{t("Platba")}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("Způsob")}</th>
            <th scope="col">{t("Jak to funguje")}</th>
            <th scope="col" className="num">
              {t("Příplatek")}
            </th>
          </tr>
        </thead>
        <tbody>
          {PAYMENT.filter((p) => p.id !== "card" || cardPaymentEnabled()).map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{t(p.title)}</strong>
              </td>
              <td>
                {t(p.note)}
                {p.id === "cod" && ` ${t("Jen při doručení Zásilkovnou nebo poštou")}.`}
              </td>
              <td className="num">{czk(p.feeHal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!cardPaymentEnabled() && <p>{t("Platbu kartou online připravujeme.")}</p>}
      <p>{t("Kredit z výkupu můžeš použít jako platbu za objednávku.")}</p>
    </LegalPage>
  );
}
