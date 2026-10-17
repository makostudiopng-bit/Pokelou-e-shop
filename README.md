# PokeLou – e-shop a výkup Pokémon karet

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Drizzle ORM · PostgreSQL (Neon) · Vercel

## Spuštění

```bash
npm install
cp .env.example .env.local   # doplnit DATABASE_URL a CRON_SECRET
npx drizzle-kit migrate      # vytvoří tabulky
npx tsx scripts/import-set.ts sv03.5 sv01   # import edic z TCGdex
npm run dev
```

Bez databáze běží úvodní stránka z ukázkových dat (`src/data/demo.ts`).

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

## Pravidla

- Částky v Kč se ukládají v haléřích (integer), sloupce `*_hal`.
- Prodejní cena = trend Cardmarketu × kurz ČNB × stav × jazyk × (1 + přirážka), zaokrouhleno na …90 Kč.
- Pravidla se skládají od obecného ke konkrétnímu: výchozí → globální → edice → karta.
- Ceny se denně stahují jen pro karty skladem a ve výkupu za posledních 30 dní.
- Kus se zamčenou cenou (`price_locked`) se nepřeceňuje.
- Písma jsou hostovaná u nás (fontsource), ne z Google Fonts.

## Testy

```bash
npx vitest run
```

Databázové testy běží proti skutečnému Postgresu v PGlite, není potřeba žádná služba.
