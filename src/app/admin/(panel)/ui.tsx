// Drobné prvky administrace (serverové).
import { BUYBACK_LABEL, ORDER_LABEL, type BuybackStatus, type OrderStatus } from "@/lib/admin-status";

export const fmtDate = (d: Date | null | undefined, time = true) =>
  d ? d.toLocaleString("cs-CZ", { day: "numeric", month: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }) }) : "–";

const ORDER_TONE: Record<OrderStatus, string> = {
  new: "todo",
  paid: "todo",
  packed: "todo",
  shipped: "ok",
  delivered: "ok",
  cancelled: "bad",
  returned: "bad",
};
const BUYBACK_TONE: Record<BuybackStatus, string> = {
  submitted: "",
  received: "todo",
  checking: "todo",
  counter_offer: "",
  approved: "todo",
  paid: "ok",
  returned: "bad",
  cancelled: "bad",
};

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <span className={`pl-status pl-status--${ORDER_TONE[status]}`}>{ORDER_LABEL[status]}</span>;
}
export function BuybackBadge({ status }: { status: BuybackStatus }) {
  return <span className={`pl-status pl-status--${BUYBACK_TONE[status]}`}>{BUYBACK_LABEL[status]}</span>;
}

export function AdminTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h1 className="m-0 text-[36px] leading-[38px] font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
        {children}
      </h1>
      {aside}
    </div>
  );
}
