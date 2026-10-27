// Rychlé přesměrování nepřihlášených z /admin na přihlášení. Skutečná kontrola je
// v každé stránce a akci administrace (requireAdmin), proxy je jen první síto.
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/prihlaseni") return NextResponse.next();
  const ok = verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
  if (!ok) return NextResponse.redirect(new URL("/admin/prihlaseni", request.url));
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
