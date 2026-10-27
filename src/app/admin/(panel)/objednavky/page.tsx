import type { Metadata } from "next";
import Link from "next/link";
import { PAYMENT, SHIPPING } from "@/config/shop";
import { getDb } from "@/db";
import { listOrders } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { ORDER_LABEL, type OrderStatus } from "@/lib/admin-status";
import { formatCzk } from "@/lib/pricing";
import { AdminTitle, fmtDate, OrderBadge } from "../ui";

export const metadata: Metadata = { title: "Objednávky" };

const TABS: (OrderStatus | "")[] = ["", "new", "paid", "packed", "shipped", "delivered", "cancelled"];

export default async function ObjednavkyAdmin({ searchParams }: PageProps<"/admin/objednavky">) {
  await requireAdmin();
  const raw = (await searchParams).stav;
  const stav = typeof raw === "string" && raw in ORDER_LABEL ? (raw as OrderStatus) : undefined;
  const orders = await listOrders(await getDb(), stav);
  return (
    <>
      <AdminTitle>Objednávky</AdminTitle>
      <nav aria-label="Stav objednávky" className="pl-tabs">
        {TABS.map((t) => (
          <Link key={t || "all"} href={t ? `/admin/objednavky?stav=${t}` : "/admin/objednavky"} aria-current={(stav ?? "") === t ? "page" : undefined}>
            {t ? ORDER_LABEL[t] : "Všechny"}
          </Link>
        ))}
      </nav>
      <div className="pl-panel overflow-x-auto p-0">
        {orders.length === 0 ? (
          <p className="pl-note m-0 p-5">Žádné objednávky v tomhle stavu.</p>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Objednávka</th>
                <th>Zákazník</th>
                <th>Stav</th>
                <th>Doprava</th>
                <th>Platba</th>
                <th className="num">Kusů</th>
                <th className="num">Celkem</th>
                <th className="num">Vytvořeno</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/objednavky/${o.id}`} style={{ fontFamily: "var(--font-mono)" }}>
                      {o.number}
                    </Link>
                  </td>
                  <td>
                    {o.name}
                    <br />
                    <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {o.email}
                    </span>
                  </td>
                  <td>
                    <OrderBadge status={o.status} />
                  </td>
                  <td>{SHIPPING.find((x) => x.id === o.shippingMethod)?.title}</td>
                  <td>{PAYMENT.find((x) => x.id === o.paymentMethod)?.title}</td>
                  <td className="num">{o.pieces}</td>
                  <td className="num">{formatCzk(o.totalHal)}</td>
                  <td className="num">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
