// 1) Odkazy s ?lang=en|cs: nastaví jazyk webu.
// 2) Rychlé přesměrování nepřihlášených z /admin na přihlášení. Skutečná kontrola je
//    v každé stránce a akci administrace (requireAdmin), proxy je jen první síto.
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { isLocale, LANG_COOKIE } from "@/i18n/config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Odkaz s ?lang=en (třeba z Instagramu) nastaví jazyk a přesměruje na stejnou adresu bez parametru.
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang != null && !pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    const res = NextResponse.redirect(url);
    if (isLocale(lang)) res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  }
  if (pathname === "/admin/prihlaseni") return NextResponse.next();
  const ok = verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
  if (!ok) return NextResponse.redirect(new URL("/admin/prihlaseni", request.url));
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    // jen požadavky s ?lang=…, ostatní stránky proxy vůbec nespouštějí
    { source: "/((?!_next|api|admin|favicon.ico).*)", has: [{ type: "query", key: "lang" }] },
  ],
};
