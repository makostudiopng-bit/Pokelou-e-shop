import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { listBuybacks } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { BUYBACK_LABEL, type BuybackStatus } from "@/lib/admin-status";
import { formatCzk } from "@/lib/pricing";
import { AdminTitle, BuybackBadge, fmtDate } from "../ui";

export const metadata: Metadata = { title: "Výkupy" };

const TABS: (BuybackStatus | "")[] = ["", "submitted", "received", "checking", "counter_offer", "approved", "paid", "returned"];

export default async function VykupyAdmin({ searchParams }: PageProps<"/admin/vykupy">) {
  await requireAdmin();
  const raw = (await searchParams).stav;
  const stav = typeof raw === "string" && raw in BUYBACK_LABEL ? (raw as BuybackStatus) : undefined;
  const rows = await listBuybacks(await getDb(), stav);
  return (
    <>
      <AdminTitle>Výkupy</AdminTitle>
      <nav aria-label="Stav výkupu" className="pl-tabs">
        {TABS.map((t) => (
          <Link key={t || "all"} href={t ? `/admin/vykupy?stav=${t}` : "/admin/vykupy"} aria-current={(stav ?? "") === t ? "page" : undefined}>
            {t ? BUYBACK_LABEL[t] : "Všechny"}
          </Link>
        ))}
      </nav>
      <div className="pl-panel overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="pl-note m-0 p-5">Žádné výkupy v tomhle stavu.</p>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Žádost</th>
                <th>Zákazník</th>
                <th className="num">Karet</th>
                <th className="num">Odhad</th>
                <th className="num">Nabídka</th>
                <th>Výplata</th>
                <th>Stav</th>
                <th className="num">Odesláno</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/admin/vykupy/${b.id}`} style={{ fontFamily: "var(--font-mono)" }}>
                      {b.number}
                    </Link>
                  </td>
                  <td>{b.name ? `${b.name} · ${b.email}` : b.email}</td>
                  <td className="num">{b.pieces}</td>
                  <td className="num">{formatCzk(b.estimateHal)}</td>
                  <td className="num">{b.offerHal != null ? formatCzk(b.offerHal) : "–"}</td>
                  <td>
                    {b.payout === "credit" ? "Kredit" : "Peníze"}
                    {b.bulkCount > 0 ? " · bulk" : ""}
                  </td>
                  <td>
                    <BuybackBadge status={b.status} />
                  </td>
                  <td className="num">{fmtDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
