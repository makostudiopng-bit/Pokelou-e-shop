// Odhlášení jedním kliknutím přímo z e-mailového programu (hlavička List-Unsubscribe-Post, RFC 8058).
// Gmail a další pošlou POST; obyčejné otevření odkazu přesměruje na stránku hlídání s tlačítkem.
import { getDb, hasDb } from "@/db";
import { cancelWatch } from "@/lib/watches";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (hasDb()) await cancelWatch(await getDb(), token);
  return new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  return Response.redirect(new URL(`/hlidani/${encodeURIComponent(token)}`, url), 303);
}
