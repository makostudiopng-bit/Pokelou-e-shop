// Dnešní prodeje pro záložku „Prodeje“ v telefonu.
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin-session";
import { listSales } from "@/lib/fair";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Přihlášení vypršelo" }, { status: 401 });
  const since = new Date(Date.now() - 24 * 3600_000);
  const sales = await listSales(await getDb(), since);
  return Response.json({ sales }, { headers: { "Cache-Control": "no-store" } });
}
