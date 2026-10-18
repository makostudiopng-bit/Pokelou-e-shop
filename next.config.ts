import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // obrázky karet z TCGdex (katalog z databáze)
    remotePatterns: [new URL("https://assets.tcgdex.net/**")],
  },
};

export default nextConfig;
