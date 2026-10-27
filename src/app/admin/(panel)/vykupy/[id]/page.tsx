import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConditionBadge } from "@/components/ui";
import { CONDITIONS } from "@/db/schema";
import { getDb } from "@/db";
import { getBuybackAdmin } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { BUYBACK_LABEL, buybackEditable, nextBuybackStatuses, type BuybackStatus } from "@/lib/admin-status";
import { formatCzk } from "@/lib/pricing";
import { ActionForm, StepButton } from "../../action-form";
import { buybackCheckAction, buybackStatusAction, buybackToStockAction } from "../../actions";
import { AdminTitle, BuybackBadge, fmtDate } from "../../ui";

export const metadata: Metadata = { title: "Výkup" };

const STEP_LABEL: Partial<Record<BuybackStatus, string>> = {
  received: "Karty dorazily",
  approved: "Schválit nabídku",
  counter_offer: "Poslat protinabídku",
  paid: "Vyplaceno",
  returned: "Vrátit karty",
  cancelled: "Zrušit (karty nepřišly)",
};

export default async function VykupAdmin({ params }: PageProps<"/admin/vykupy/[id]">) {
  await requireAdmin();
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getBuybackAdmin(await getDb(), id);
  if (!data) notFound();
  const { req, items } = data;
  const editable = buybackEditable(req.status);
  const next = nextBuybackStatuses(req.status);
  const offer = items.reduce((a, i) => a + (i.finalHal ?? i.estimateHal), 0);
  const canStock = (req.status === "approved" || req.status === "paid") && items.some((i) => !i.stocked && (i.finalHal ?? i.estimateHal) > 0);

  return (
    <>
      <Link href="/admin/vykupy" className="text-sm font-bold">
        ← Výkupy
      </Link>
      <AdminTitle aside={<BuybackBadge status={req.status} />}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em" }}>{req.number}</span>
      </AdminTitle>
      <p className="m-0 text-[15px]" style={{ color: "var(--ink-muted)" }}>
        {req.name ? `${req.name} · ` : ""}
        <a href={`mailto:${req.email}`}>{req.email}</a> · výplata {req.payout === "credit" ? "kreditem" : `převodem na ${req.bankAccount}`} ·{" "}
        {req.isAdultConfirmed ? "18+ potvrzeno" : "18+ NEpotvrzeno"} · odesláno {fmtDate(req.createdAt)} · odhad platí do {fmtDate(req.estimateValidTo, false)}
      </p>

      <ActionForm action={buybackCheckAction} className="pl-panel flex flex-col gap-4">
        <input type="hidden" name="id" value={req.id} />
        <div className="overflow-x-auto">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Karta</th>
                <th>Zákazník uvedl</th>
                <th>Skutečný stav</th>
                <th className="num">Odhad</th>
                <th className="num">Konečná cena</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const checked = it.checkedCondition ?? it.declaredCondition;
                const worse = it.checkedCondition && CONDITIONS.indexOf(it.checkedCondition) > CONDITIONS.indexOf(it.declaredCondition);
                return (
                  <tr key={it.id}>
                    <td>
                      <span className="flex items-center gap-3">
                        {it.card?.image ? <Image src={it.card.image} alt="" width={630} height={880} sizes="36px" className="h-auto w-9 rounded-[2px]" /> : <span className="pl-tile__ph w-9" />}
                        <span>
                          <strong>{it.card?.name ?? it.cardId}</strong>
                          <br />
                          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                            {it.card ? `${it.card.setCode} ${it.card.number}` : ""} · {it.language} · {it.quantity} ks{it.stocked ? " · naskladněno" : ""}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <ConditionBadge condition={it.declaredCondition} />
                    </td>
                    <td>
                      <input type="hidden" name="itemId" value={it.id} />
                      {editable ? (
                        <select name={`cond-${it.id}`} defaultValue={checked} aria-label={`Skutečný stav: ${it.card?.name ?? ""}`} className="pl-select py-1">
                          {CONDITIONS.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <ConditionBadge condition={checked} />
                      )}
                      {worse && (
                        <span className="ml-2 text-xs font-bold" style={{ color: "var(--brand-red)" }}>
                          horší než uvedeno
                        </span>
                      )}
                    </td>
                    <td className="num">{it.estimateHal ? formatCzk(it.estimateHal) : "bulk"}</td>
                    <td className="num">
                      {editable ? (
                        <span className="pl-field__wrap ml-auto w-[120px]">
                          <input
                            name={`final-${it.id}`}
                            inputMode="numeric"
                            defaultValue={String((it.finalHal ?? it.estimateHal) / 100)}
                            aria-label={`Konečná cena: ${it.card?.name ?? ""}`}
                            className="pl-field__input w-full pr-9 text-right"
                          />
                          <span className="pl-field__suffix">Kč</span>
                        </span>
                      ) : (
                        <strong>{formatCzk(it.finalHal ?? it.estimateHal)}</strong>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {req.bulkCount > 0 && <p className="pl-note m-0">{req.bulkCount} ks je bulk – cenu zadej do konečné ceny u příslušné karty.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[15px]">
            Odhad {offer !== req.estimateHal ? <s>{formatCzk(req.estimateHal)}</s> : formatCzk(req.estimateHal)} · Nabídka <strong className="text-lg">{formatCzk(req.offerHal ?? offer)}</strong>
          </span>
          {editable && (
            <button type="submit" className="pl-btn pl-btn--secondary pl-btn--sm">
              Uložit kontrolu
            </button>
          )}
        </div>
      </ActionForm>

      <div className="flex flex-wrap gap-5">
        {next.length > 0 && (
          <ActionForm
            action={buybackStatusAction}
            className="pl-panel flex flex-[1_1_360px] flex-col gap-3"
            confirm={{ paid: "Potvrzuješ, že je výkup vyplacený? U kreditu se teď připíše zákazníkovi.", returned: "Vrátit karty zákazníkovi?", cancelled: "Zrušit výkup?" }}
          >
            <h2 className="m-0 text-xl font-extrabold">Další krok</h2>
            <input type="hidden" name="id" value={req.id} />
            <div className="flex flex-wrap gap-2">
              {next.map((to, i) => (
                <StepButton key={to} to={to} label={STEP_LABEL[to] ?? BUYBACK_LABEL[to]} variant={to === "returned" || to === "cancelled" ? "danger" : i === 0 ? "primary" : "secondary"} />
              ))}
            </div>
            {editable && <p className="pl-note m-0">Před schválením nebo protinabídkou ulož kontrolu, nabídka se počítá z konečných cen.</p>}
            {req.status === "approved" && req.payout === "credit" && <p className="pl-note m-0">Po „Vyplaceno“ se zákazníkovi připíše kredit {formatCzk(req.offerHal ?? offer)}.</p>}
          </ActionForm>
        )}
        {canStock && (
          <ActionForm action={buybackToStockAction} className="pl-panel flex flex-[1_1_320px] flex-col gap-3">
            <h2 className="m-0 text-xl font-extrabold">Naskladnit</h2>
            <input type="hidden" name="id" value={req.id} />
            <p className="pl-note m-0">Vykoupené karty se přidají na sklad se skutečným stavem a cenou podle trhu. Nákupní cena = konečná výkupní cena.</p>
            <button type="submit" className="pl-btn pl-btn--primary pl-btn--sm self-start">
              Přesunout karty na sklad
            </button>
          </ActionForm>
        )}
      </div>
    </>
  );
}
