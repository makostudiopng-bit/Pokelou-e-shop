"use client";
// Přepínač jazyka CZ / EN. Volba se uloží do cookie na rok a stránka se znovu vykreslí
// na serveru ve druhém jazyce (adresa zůstává stejná).
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LANG_COOKIE } from "@/i18n/config";
import { useT } from "@/i18n/client";

export function LangToggle() {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = t.locale === "cs" ? "en" : "cs";
  return (
    <button
      type="button"
      className="pl-theme pl-lang-toggle pl-lift"
      disabled={pending}
      lang={next}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      // popisek je v jazyce, do kterého se přepíná, ať ho najde i ten, kdo češtině nerozumí
      aria-label={next === "en" ? "Switch to English" : "Přepnout do češtiny"}
      title={next === "en" ? "English" : "Čeština"}
    >
      {next === "en" ? "EN" : "CZ"}
    </button>
  );
}
