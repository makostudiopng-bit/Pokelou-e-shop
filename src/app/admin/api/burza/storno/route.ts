// Storno prodeje z burzy: kus se vrátí do skladu.
import { getDb } from "@/db";
import { isAdmin } from "@/lib/admin-session";
import { cancelSale, FairError } from "@/lib/fair";

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Přihlášení vypršelo" }, { status: 401 });
  const { id } = ((await request.json().catch(() => ({}))) ?? {}) as { id?: unknown };
  if (typeof id !== "string") return Response.json({ error: "Chybí prodej" }, { status: 400 });
  try {
    await cancelSale(await getDb(), id);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof FairError) return Response.json({ error: e.message }, { status: 409 });
    console.error("Burza: storno selhalo", e);
    return Response.json({ error: "Storno se nepovedlo" }, { status: 503 });
  }
}
