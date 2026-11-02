import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PokeLou – Pokémon karty, prodej a výkup", template: "%s · PokeLou" },
  description:
    "Jednotlivé Pokémon karty skladem s poctivě popsaným stavem. Výkup karet za peníze i kredit do e-shopu.",
};

// Den/noc: uložená volba zákazníka, jinak podle zařízení (řeší CSS). Běží před vykreslením, takže nic nepoblikne.
const THEME_SCRIPT = `try{var t=localStorage.getItem("pl_theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme nastaví skript níž ještě před vykreslením, proto suppressHydrationWarning
    <html lang="cs" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
