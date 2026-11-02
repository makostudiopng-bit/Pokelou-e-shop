import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin-session";
import { listSales, summarize } from "@/lib/fair";
import { formatCzk } from "@/lib/pricing";
import { ActionForm } from "../action-form";
import { fairCancelAction, fairCloseAction, fairRetryAction } from "../actions";
import { AdminTitle, fmtDate } from "../ui";

export const metadata: Metadata = { title: "Prodeje na burzách" };

const PAY = { cash: "hotově", card: "kartou", transfer: "převodem" } as const;

export default async function BurzyAdmin() {
  await requireAdmin();
  const sales = await listSales(await getDb());
  const events = summarize(sales);
  const conflicts = sales.filter((x) => x.status === "conflict" && !x.resolvedAt);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminTitle>Prodeje na burzách</AdminTitle>
        <Link href="/admin/burza" className="pl-btn pl-btn--primary pl-btn--sm no-underline">
          Otevřít prodejní režim (telefon)
        </Link>
      </div>
      <p className="pl-note m-0 max-w-[760px]">
        Prodej na burze odečítá kusy ze stejného skladu jako e-shop, takže co prodáš na místě, z e-shopu hned zmizí, a co se prodá online, na burze se ukáže jako
        vyprodané. Prodejní režim otevři v telefonu ještě s internetem; při výpadku sítě se prodeje uloží v telefonu a odešlou se samy. Kdyby se kus mezitím prodal
        na e-shopu, objeví se tady jako konflikt.
      </p>

      {conflicts.length > 0 && (
        <section className="pl-panel flex flex-col gap-3" style={{ borderColor: "var(--brand-red)" }}>
          <h2 className="m-0 text-xl font-extrabold">Konflikty k vyřešení ({conflicts.length})</h2>
          <p className="pl-note m-0">
            Kus se prodal na burze i jinde (nejspíš na e-shopu). Buď zruš online objednávku a pak klepni „Odečíst ze skladu“, nebo to vyřeš se zákazníkem a dej
            „Vyřešeno“.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {conflicts.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 rounded-[10px] p-3" style={{ background: "var(--surface-200)" }}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong>
                    {x.quantity > 1 && `${x.quantity}× `}
                    {x.title}
                  </strong>
                  <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    {x.eventName} · {fmtDate(x.soldAt)} · {formatCzk(x.unitHal * x.quantity)} {PAY[x.payment]}
                  </span>
                </span>
                <ActionForm action={fairRetryAction} className="flex gap-2">
                  <input type="hidden" name="id" value={x.id} />
                  <button type="submit" className="pl-btn pl-btn--secondary pl-btn--sm">
                    Odečíst ze skladu
                  </button>
                </ActionForm>
                <ActionForm action={fairCloseAction}>
                  <input type="hidden" name="id" value={x.id} />
                  <button type="submit" className="pl-btn pl-btn--secondary pl-btn--sm">
                    Vyřešeno
                  </button>
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((e) => (
          <section key={e.event} className="pl-panel flex flex-col gap-1.5">
            <h2 className="m-0 text-lg font-extrabold">{e.event}</h2>
            <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
              od {fmtDate(e.first)} · {e.pieces} ks
            </span>
            <strong className="text-[28px] leading-8" style={{ fontFamily: "var(--font-display)" }}>
              {formatCzk(e.totalHal)}
            </strong>
            <span className="text-[13px]">
              hotově {formatCzk(e.cashHal)} · kartou {formatCzk(e.cardHal)} · převodem {formatCzk(e.transferHal)}
            </span>
            {e.discountHal > 0 && (
              <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                slevy na místě {formatCzk(e.discountHal)}
              </span>
            )}
          </section>
        ))}
        {events.length === 0 && <p className="pl-note m-0">Zatím žádný prodej na burze.</p>}
      </div>

      {sales.length > 0 && (
        <div className="pl-panel overflow-x-auto p-0">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Čas</th>
                <th>Burza</th>
                <th>Položka</th>
                <th className="num">Ks</th>
                <th className="num">Cena/ks</th>
                <th>Platba</th>
                <th>Stav</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sales.map((x) => (
                <tr key={x.id} style={x.status === "cancelled" ? { opacity: 0.5 } : undefined}>
                  <td className="num">{fmtDate(x.soldAt)}</td>
                  <td>{x.eventName}</td>
                  <td>
                    {x.title}
                    {!x.stockItemId && <span className="pl-note"> · mimo sklad</span>}
                  </td>
                  <td className="num">{x.quantity}</td>
                  <td className="num">
                    {formatCzk(x.unitHal)}
                    {x.listHal != null && x.listHal > x.unitHal && (
                      <span className="pl-note">
                        <br />z {formatCzk(x.listHal)}
                      </span>
                    )}
                  </td>
                  <td>{PAY[x.payment]}</td>
                  <td>
                    <span className={`pl-status pl-status--${x.status === "ok" ? "ok" : x.status === "conflict" && !x.resolvedAt ? "bad" : "todo"}`}>
                      {x.status === "ok" ? "prodáno" : x.status === "cancelled" ? "storno" : x.resolvedAt ? "konflikt vyřešen" : "konflikt"}
                    </span>
                  </td>
                  <td>
                    {x.status !== "cancelled" && (
                      <ActionForm action={fairCancelAction} confirm={{ cancel: "Stornovat prodej? Kus se vrátí do skladu." }}>
                        <input type="hidden" name="id" value={x.id} />
                        <button type="submit" name="to" value="cancel" className="pl-linkbtn">
                          Storno
                        </button>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
