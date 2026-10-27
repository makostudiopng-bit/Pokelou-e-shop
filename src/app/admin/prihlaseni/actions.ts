"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminConfigured, createSessionToken, SESSION_HOURS, verifyPassword } from "@/lib/admin-auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: "Administrace ještě není nastavená (chybí ADMIN_PASSWORD_HASH a ADMIN_SESSION_SECRET)." };
  const pw = form.get("password");
  const ok = typeof pw === "string" && pw.length <= 200 && (await verifyPassword(pw, process.env.ADMIN_PASSWORD_HASH));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 700)); // zpomalit hádání hesla
    return { error: "Špatné heslo" };
  }
  (await cookies()).set(ADMIN_COOKIE, createSessionToken(process.env.ADMIN_SESSION_SECRET!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: SESSION_HOURS * 3600,
  });
  redirect("/admin");
}

export async function logoutAction() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  redirect("/admin/prihlaseni");
}
