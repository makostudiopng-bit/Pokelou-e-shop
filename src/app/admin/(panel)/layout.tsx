import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDb, hasDb } from "@/db";
import { dashboardCounts } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";
import { logoutAction } from "../prihlaseni/actions";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  title: { default: "Administrace", template: "%s · Administrace PokeLou" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const counts = hasDb() ? await dashboardCounts(await getDb()) : null;
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <nav aria-label="Administrace" className="flex flex-col gap-4 p-4 md:sticky md:top-0 md:h-screen md:w-[240px] md:flex-none" style={{ background: "var(--surface-inverse)", color: "var(--ink-inverse)" }}>
        <Link href="/admin" className="flex items-center gap-2.5 no-underline" style={{ color: "var(--ink-inverse)" }}>
          <Image src="/brand/logo.png" alt="" width={40} height={40} />
          <span className="text-lg font-extrabold">Administrace</span>
        </Link>
        <AdminNav orders={counts?.ordersToHandle ?? 0} buybacks={counts?.buybacksToHandle ?? 0} />
        <div className="mt-auto flex flex-col gap-1 text-sm">
          <Link href="/" className="font-bold" style={{ color: "var(--ink-inverse)" }}>
            ← Na e-shop
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="cursor-pointer p-0 font-bold underline" style={{ color: "var(--ink-inverse)" }}>
              Odhlásit
            </button>
          </form>
        </div>
      </nav>
      <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-6 sm:px-8" style={{ background: "var(--surface-000)" }}>
        {hasDb() ? children : <p className="pl-panel m-0">Administrace potřebuje databázi (DATABASE_URL).</p>}
      </main>
    </div>
  );
}
