# PokeLou – e-shop a výkup Pokémon karet

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Drizzle ORM · PostgreSQL (Neon) · Vercel

## Spuštění

```bash
npm install
cp .env.example .env.local   # doplnit DATABASE_URL a CRON_SECRET
# bez Neonu jde lokálně použít Postgres v souboru: DATABASE_URL="pglite:./.data/pglite"
npx tsx scripts/migrate.mts  # vytvoří tabulky a prázdnou DB naplní ukázkovým skladem (na Vercelu běží při každém buildu)
npx tsx scripts/import-set.mts sv03.5 sv01   # import edic z TCGdex
npm run dev
```

Bez databáze běží web z ukázkových dat (`src/data/demo.ts`), objednávky se ale neukládají.
Prázdnou databázi build naplní ukázkovým skladem (kusy s poznámkou `demo`, vypnout `SEED_DEMO=0`).
Před ostrým spuštěním je smaže `npx tsx scripts/remove-demo.mts`.

Kontrola nasazení: `/api/health` ukáže, jestli je nastavená databáze a `CRON_SECRET`, jestli existují tabulky a kolik je v nich karet. Hodnoty proměnných nevrací.

## Struktura

| Cesta | Co obsahuje |
| --- | --- |
| `src/db/schema.ts` | databázové schéma (katalog, sklad, objednávky, výkup, kredit, cenová pravidla) |
| `drizzle/` | SQL migrace generované ze `schema.ts` (`npx drizzle-kit generate`) |
| `src/lib/pricing.ts` | prodejní ceny a výkupní odhady (čisté funkce) |
| `src/lib/tcgdex.ts` | klient TCGdex a mapování na řádky DB |
| `src/lib/cnb.ts` | denní kurz EUR/CZK z ČNB |
| `src/lib/sync.ts` | import edic, denní ceny, přecenění skladu |
| `src/app/api/cron/daily` | denní úloha (Vercel Cron, 04:30 UTC) |
| `src/styles/` | tokeny a styly z design systému PokeLou (třídy `pl-*`) |
| `src/components/ui.tsx` | Button, ConditionBadge, CardTile |
| `src/lib/catalog-query.ts` | filtry, hledání a řazení katalogu (čisté funkce, parametry z URL) |
| `src/lib/catalog.ts` | nabídky ze skladu v DB, záložně ukázková data |
| `src/app/karty`, `src/app/karta/[slug]` | výpis karet s filtry, detail karty s výběrem kusu |
| `src/lib/cart.ts`, `src/app/kosik` | košík v cookie (jen ID kusu a počet), ceny a dostupnost vždy ze skladu |
| `src/config/shop.ts` | doprava, platby, kontakty – dočasné hodnoty k potvrzení klientem |
| `src/lib/checkout.ts`, `src/lib/orders.ts`, `src/app/pokladna` | pokladna, kontrola formuláře, vytvoření objednávky s odečtem skladu |
| `src/lib/spayd.ts`, `src/app/objednavka/[id]` | QR platba (SPAYD), potvrzení objednávky |

## Pravidla

- Částky v Kč se ukládají v haléřích (integer), sloupce `*_hal`.
- Prodejní cena = trend Cardmarketu × kurz ČNB × stav × jazyk × (1 + přirážka), zaokrouhleno na …90 Kč.
- Pravidla se skládají od obecného ke konkrétnímu: výchozí → globální → edice → karta.
- Ceny se denně stahují jen pro karty skladem a ve výkupu za posledních 30 dní.
- Kus se zamčenou cenou (`price_locked`) se nepřeceňuje.
- Písma jsou hostovaná u nás (fontsource), ne z Google Fonts.
- Košík nikdy nevěří ceně z prohlížeče: v cookie je jen ID kusu a počet, zbytek se dopočítá ze skladu.

## Testy

```bash
npx vitest run
```

Databázové testy běží proti skutečnému Postgresu v PGlite, není potřeba žádná služba.
