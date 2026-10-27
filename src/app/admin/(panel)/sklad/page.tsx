import type { Metadata } from "next";
import Link from "next/link";
import { ConditionBadge } from "@/components/ui";
import { getDb } from "@/db";
import { listStock } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { FINISH_LABEL } from "@/lib/catalog";
import { formatCzk } from "@/lib/pricing";
import { ActionForm } from "../action-form";
import { stockUpdateAction } from "../actions";
import { AdminTitle } from "../ui";

export const metadata: Metadata = { title: "Sklad" };

export default async function SkladAdmin({ searchParams }: PageProps<"/admin/sklad">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const only = sp.skladem === "1";
  const rows = await listStock(await getDb(), q, only);
  return (
    <>
      <AdminTitle
        aside={
          <Link href="/admin/naskladnit" className="pl-btn pl-btn--primary pl-btn--sm no-underline">
            Naskladnit kartu
          </Link>
        }
      >
        Sklad
      </AdminTitle>
      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="pl-field min-w-[240px] flex-1">
          <label htmlFor="sq" className="pl-field__label">
            Hledat na skladě
          </label>
          <input id="sq" name="q" type="search" defaultValue={q} placeholder="Název, číslo nebo kód edice" className="pl-field__input" />
        </div>
        <label className="pl-check pb-2.5">
          <input type="checkbox" name="skladem" value="1" defaultChecked={only} />
          Jen skladem
        </label>
        <button type="submit" className="pl-btn pl-btn--secondary pl-btn--sm">
          Hledat
        </button>
      </form>
      <div className="pl-panel overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="pl-note m-0 p-5">Nic nenalezeno.</p>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Karta</th>
                <th>Stav</th>
                <th className="num">Nákup</th>
                <th>Cena, počet, zámek ceny</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, name, localId, set, setCode }) => (
                <tr key={item.id}>
                  <td>
                    <strong>{name}</strong>
                    <br />
                    <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {set} · {setCode} {localId}
                      {item.note === "demo" ? " · ukázka" : ""}
                      {item.source === "buyback" ? " · z výkupu" : ""}
                    </span>
                  </td>
                  <td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <ConditionBadge condition={item.condition} />
                      <span className="pl-lang">{item.language}</span>
                      <span className="text-xs">{FINISH_LABEL[item.finish]}</span>
                    </span>
                  </td>
                  <td className="num">{item.purchaseHal ? formatCzk(item.purchaseHal) : "–"}</td>
                  <td>
                    <ActionForm action={stockUpdateAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <span className="pl-field__wrap w-[110px]">
                        <input name="price" inputMode="numeric" defaultValue={String(item.priceHal / 100)} aria-label={`Cena: ${name}`} className="pl-field__input w-full pr-8 text-right" />
                        <span className="pl-field__suffix">Kč</span>
                      </span>
                      <span className="pl-field__wrap w-[84px]">
                        <input name="qty" type="number" min={0} max={999} defaultValue={item.quantity} aria-label={`Počet: ${name}`} className="pl-field__input w-full pr-8 text-right" />
                        <span className="pl-field__suffix">ks</span>
                      </span>
                      <label className="pl-check text-xs" title="Zamčenou cenu nepřepisuje denní přecenění podle trhu">
                        <input type="checkbox" name="locked" defaultChecked={item.priceLocked} />
                        zamknout
                      </label>
                      <button type="submit" className="pl-btn pl-btn--secondary pl-btn--sm">
                        Uložit
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
