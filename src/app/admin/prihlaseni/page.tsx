import type { Metadata } from "next";
import Image from "next/image";
import { adminConfigured } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Přihlášení do administrace", robots: { index: false, follow: false } };

export default function PrihlaseniPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16" style={{ background: "var(--surface-inverse)" }}>
      <div className="flex w-full max-w-[380px] flex-col gap-5 rounded-2xl p-7" style={{ background: "var(--surface-100)", border: "2px solid var(--ink)", boxShadow: "4px 4px 0 var(--brand-yellow)" }}>
        <div className="flex items-center gap-3">
          <Image src="/brand/logo.png" alt="PokeLou" width={56} height={56} />
          <h1 className="m-0 text-[30px] leading-8 font-extrabold" style={{ fontFamily: "var(--font-display)" }}>
            Administrace
          </h1>
        </div>
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <div className="flex flex-col gap-2 text-[15px] leading-[22px]">
            <p className="m-0">
              Přihlášení ještě není nastavené. Vygeneruj heslo příkazem <code>npx tsx scripts/admin-password.mts &quot;heslo&quot;</code> a obě vypsané hodnoty vlož do Vercelu
              jako proměnné prostředí. Pak dej Redeploy.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
