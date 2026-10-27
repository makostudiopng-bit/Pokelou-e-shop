// Kontrola přihlášení pro stránky a akce administrace (jen na serveru).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminConfigured, verifySessionToken } from "./admin-auth";

export async function isAdmin() {
  if (!adminConfigured()) return false;
  return verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
}

/** Volat na začátku každé stránky a každé Server Action v administraci. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/prihlaseni");
}
