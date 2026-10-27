import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { recentIntake } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { formatCzk } from "@/lib/pricing";
import { AdminTitle, fmtDate } from "../ui";
import { IntakeForm } from "./intake-form";

export const metadata: Metadata = { title: "Naskladnit" };

export default async function NaskladnitAdmin() {
  await requireAdmin();
  const recent = await recentIntake(await getDb());
  return (
    <>
      <AdminTitle>Naskladnit kartu</AdminTitle>
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[999_1_520px]">
          <IntakeForm />
        </div>
        <aside aria-labelledby="recent-h" className="pl-panel flex min-w-0 flex-[1_1_300px] flex-col gap-3">
          <h2 id="recent-h" className="m-0 text-lg font-extrabold">
            Naposledy změněno
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {recent.map(({ item, name, localId, setCode }) => (
              <li key={item.id} className="flex items-baseline justify-between gap-2">
                <span>
                  <strong>{name}</strong>{" "}
                  <span style={{ color: "var(--ink-muted)" }}>
                    {setCode} {localId} · {item.condition} · {item.language} · {item.quantity} ks · {fmtDate(item.updatedAt)}
                  </span>
                </span>
                <strong className="whitespace-nowrap">{formatCzk(item.priceHal)}</strong>
              </li>
            ))}
          </ul>
          <Link href="/admin/sklad" className="text-sm font-bold">
            Celý sklad →
          </Link>
        </aside>
      </div>
    </>
  );
}
