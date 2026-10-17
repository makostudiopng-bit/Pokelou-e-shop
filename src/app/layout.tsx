import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { default: "PokeLou – Pokémon karty, prodej a výkup", template: "%s · PokeLou" },
  description:
    "Jednotlivé Pokémon karty skladem s poctivě popsaným stavem. Výkup karet za peníze i kredit do e-shopu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs">
      <body className="flex min-h-screen flex-col overflow-x-hidden">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
