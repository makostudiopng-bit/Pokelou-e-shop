import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (lokální Postgres pro vývoj a testy) se nebalí, načítá se z node_modules
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    // obrázky karet z TCGdex (katalog z databáze)
    remotePatterns: [new URL("https://assets.tcgdex.net/**")],
  },
};

export default nextConfig;
