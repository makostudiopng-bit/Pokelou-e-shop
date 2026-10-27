import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAYMENT, SHIPPING } from "@/config/shop";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin-session";
import { nextOrderStatuses, ORDER_ACTION } from "@/lib/admin-status";
import { getOrder } from "@/lib/orders";
import { formatCzk } from "@/lib/pricing";
import { ActionForm, StepButton } from "../../action-form";
import { orderStatusAction } from "../../actions";
import { AdminTitle, fmtDate, OrderBadge } from "../../ui";

export const metadata: Metadata = { title: "Objednávka" };

export default async function ObjednavkaAdmin({ params }: PageProps<"/admin/objednavky/[id]">) {
  await requireAdmin();
  const data = await getOrder(await getDb(), (await params).id);
  if (!data) notFound();
  const { order: o, items } = data;
  const next = nextOrderStatuses(o.status, o.paymentMethod);
  const point = (o.shippingPoint as { name?: string } | null)?.name;
  const addr = o.address as { street?: string; city?: string; zip?: string } | null;

  return (
    <>
      <Link href="/admin/objednavky" className="text-sm font-bold">
        ← Objednávky
      </Link>
      <AdminTitle aside={<OrderBadge status={o.status} />}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em" }}>{o.number}</span>
      </AdminTitle>

      <div className="flex flex-wrap items-start gap-5">
        <section className="pl-panel flex min-w-0 flex-[999_1_480px] flex-col gap-3">
          <h2 className="m-0 text-xl font-extrabold">Karty k zabalení</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3">
                {it.image ? <Image src={it.image} alt="" width={630} height={880} sizes="48px" className="h-auto w-12 flex-none rounded-[3px]" /> : <span className="pl-tile__ph w-12" />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong>{it.title}</strong>
                  <span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
                    {it.condition} · {it.language}
                  </span>
                </span>
                <strong className="text-lg">{it.quantity}×</strong>
                <span className="min-w-[90px] text-right">{formatCzk(it.unitHal * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[15px]" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <dt>Karty</dt>
            <dd className="m-0 text-right">{formatCzk(o.itemsHal)}</dd>
            <dt>Doprava · {SHIPPING.find((x) => x.id === o.shippingMethod)?.title}</dt>
            <dd className="m-0 text-right">{formatCzk(o.shippingHal)}</dd>
            {o.codFeeHal > 0 && (
              <>
                <dt>Dobírka</dt>
                <dd className="m-0 text-right">{formatCzk(o.codFeeHal)}</dd>
              </>
            )}
            <dt className="font-extrabold">Celkem</dt>
            <dd className="m-0 text-right font-extrabold">{formatCzk(o.totalHal)}</dd>
          </dl>
        </section>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <section className="pl-panel flex flex-col gap-3">
            <h2 className="m-0 text-xl font-extrabold">Další krok</h2>
            {next.length === 0 ? (
              <p className="pl-note m-0">Objednávka je uzavřená.</p>
            ) : (
              <ActionForm
                action={orderStatusAction}
                className="flex flex-col gap-3"
                confirm={{ cancelled: "Zrušit objednávku? Kusy se vrátí do skladu.", returned: "Označit jako vrácenou? Kusy se vrátí do skladu." }}
              >
                <input type="hidden" name="id" value={o.id} />
                {next.includes("shipped") && (
                  <div className="pl-field">
                    <label htmlFor="tracking" className="pl-field__label">
                      Sledovací číslo (nepovinné)
                    </label>
                    <input id="tracking" name="tracking" className="pl-field__input" defaultValue={o.trackingNumber ?? ""} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {next.map((to) => (
                    <StepButton key={to} to={to} label={ORDER_ACTION[to]} variant={to === "cancelled" || to === "returned" ? "danger" : to === next[0] ? "primary" : "secondary"} />
                  ))}
                </div>
              </ActionForm>
            )}
          </section>

          <section className="pl-panel flex flex-col gap-2 text-[15px]">
            <h2 className="m-0 text-xl font-extrabold">Zákazník</h2>
            <strong>{o.name}</strong>
            <a href={`mailto:${o.email}`}>{o.email}</a>
            <a href={`tel:${o.phone?.replace(/\s/g, "")}`}>{o.phone}</a>
            {o.companyId && <span>IČO {o.companyId}</span>}
            {point && <span>Výdejní místo: {point}</span>}
            {addr?.street && (
              <span>
                {addr.street}, {addr.zip} {addr.city}
              </span>
            )}
          </section>

          <section className="pl-panel flex flex-col gap-1.5 text-[15px]">
            <h2 className="m-0 text-xl font-extrabold">Platba</h2>
            <span>{PAYMENT.find((x) => x.id === o.paymentMethod)?.title}</span>
            {o.paymentMethod === "bank_transfer" && (
              <span>
                VS <strong style={{ fontFamily: "var(--font-mono)" }}>{o.paymentRef}</strong>
              </span>
            )}
            <span>Zaplaceno: {o.paidAt ? fmtDate(o.paidAt) : "ne"}</span>
            <span>Odesláno: {o.shippedAt ? fmtDate(o.shippedAt) : "ne"}</span>
            {o.trackingNumber && <span>Sledovací číslo: {o.trackingNumber}</span>}
            <span className="pl-note">Vytvořeno {fmtDate(o.createdAt)}</span>
          </section>
        </div>
      </div>
    </>
  );
}
