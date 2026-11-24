import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { LocaleProvider } from "@/i18n/client";
import { getEurCzk, getLocale, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t("PokeLou – Pokémon karty, prodej a výkup"), template: "%s · PokeLou" },
    description: t("Jednotlivé Pokémon karty skladem s poctivě popsaným stavem. Výkup karet za peníze i kredit do e-shopu."),
  };
}

// Den/noc: uložená volba zákazníka, jinak podle zařízení (řeší CSS). Běží před vykreslením, takže nic nepoblikne.
const THEME_SCRIPT = `try{var t=localStorage.getItem("pl_theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const eurCzk = locale === "cs" ? undefined : await getEurCzk();
  return (
    // data-theme nastaví skript níž ještě před vykreslením, proto suppressHydrationWarning
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-hidden">
        <LocaleProvider locale={locale} eurCzk={eurCzk}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
