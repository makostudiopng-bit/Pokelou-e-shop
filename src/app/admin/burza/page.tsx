import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { hasDb } from "@/db";
import { requireAdmin } from "@/lib/admin-session";
import { FairPosLoader } from "./loader";

export const metadata: Metadata = { title: "Prodej na burze", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function BurzaPage() {
  await requireAdmin();
  if (!hasDb()) return <p className="pl-panel m-4">Burza potřebuje databázi (DATABASE_URL).</p>;
  return (
    <main className="flex flex-1 flex-col" style={{ background: "var(--surface-000)" }}>
      <FairPosLoader />
      <Link href="/admin/burzy" className="pl-note p-4 text-center">
        Přehled prodejů a konflikty v administraci →
      </Link>
    </main>
  );
}
