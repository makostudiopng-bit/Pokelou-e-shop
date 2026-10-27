import Link from "next/link";
import { getDb } from "@/db";
import { dashboardCounts, listBuybacks, listOrders } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { formatCzk } from "@/lib/pricing";
import { AdminTitle, BuybackBadge, fmtDate, OrderBadge } from "./ui";

export default async function AdminHome() {
  await requireAdmin();
  const db = await getDb();
  const [c, orders, buybacks] = await Promise.all([dashboardCounts(db), listOrders(db), listBuybacks(db)]);
  const tiles: [string, string | number, string, string][] = [
    ["Čeká na zaplacení", c.orders.new ?? 0, "/admin/objednavky?stav=new", "objednávek"],
    ["Zabalit a odeslat", (c.orders.paid ?? 0) + (c.orders.packed ?? 0), "/admin/objednavky?stav=paid", "objednávek"],
    ["Výkupy k vyřízení", c.buybacksToHandle, "/admin/vykupy", "žádostí"],
    ["Skladem", c.stock.pieces, "/admin/sklad", `kusů za ${formatCzk(c.stock.valueHal)}`],
  ];
  return (
    <>
      <AdminTitle>Přehled</AdminTitle>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([label, n, href, unit]) => (
          <Link key={label} href={href} className="pl-panel pl-lift flex flex-col gap-1 no-underline" style={{ color: "var(--ink)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--ink-muted)" }}>
              {label}
            </span>
            <strong className="text-[40px] leading-10" style={{ fontFamily: "var(--font-display)" }}>
              {n}
            </strong>
            <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
              {unit}
            </span>
          </Link>
        ))}
      </div>

      <section className="pl-panel flex flex-col gap-3 overflow-x-auto">
        <h2 className="m-0 text-xl font-extrabold">Poslední objednávky</h2>
        {orders.length === 0 ? (
          <p className="pl-note m-0">Zatím žádné objednávky.</p>
        ) : (
          <table className="pl-table">
            <tbody>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/objednavky/${o.id}`}>{o.number}</Link>
                  </td>
                  <td>{o.name}</td>
                  <td>
                    <OrderBadge status={o.status} />
                  </td>
                  <td className="num">{formatCzk(o.totalHal)}</td>
                  <td className="num">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="pl-panel flex flex-col gap-3 overflow-x-auto">
        <h2 className="m-0 text-xl font-extrabold">Poslední výkupy</h2>
        {buybacks.length === 0 ? (
          <p className="pl-note m-0">Zatím žádné výkupy.</p>
        ) : (
          <table className="pl-table">
            <tbody>
              {buybacks.slice(0, 6).map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/admin/vykupy/${b.id}`}>{b.number}</Link>
                  </td>
                  <td>{b.email}</td>
                  <td>
                    <BuybackBadge status={b.status} />
                  </td>
                  <td className="num">{formatCzk(b.offerHal ?? b.estimateHal)}</td>
                  <td className="num">{fmtDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
